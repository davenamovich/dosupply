import { createHmac, timingSafeEqual } from "crypto";
import { addChat, listChats, removeChat, replaceChatId } from "./store";
import { tg } from "./telegram";
import type { TelegramChat } from "./types";

/**
 * Self-service chat connection.
 *
 * Telegram bots cannot create groups, but they can learn a chat's ID the
 * moment they are added to it or started in it. This module handles those
 * updates (via the webhook route) so nobody has to copy chat IDs by hand.
 *
 * Because alerts contain customer contact details, a chat only subscribes when
 * the message carries the connect code, which is derived from the bot token
 * and only shown on the passcode-protected dashboard.
 */

const token = () => (process.env.TELEGRAM_BOT_TOKEN || "").trim();

function mac(label: string): string {
  const key = `${token()}:${process.env.ADMIN_PASSCODE?.trim() || ""}`;
  return createHmac("sha256", key).update(label).digest("base64url");
}

/** Secret the webhook must present in X-Telegram-Bot-Api-Secret-Token. */
export function webhookSecret(): string {
  return mac("webhook").slice(0, 40);
}

/** Code a chat must send to subscribe. Changing the bot token or ADMIN_PASSCODE rotates it. */
export function connectCode(): string {
  return mac("connect").slice(0, 22);
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function webhookSecretValid(header: string | null): boolean {
  return Boolean(token()) && header !== null && same(header, webhookSecret());
}

type Update = {
  message?: {
    text?: string;
    chat: { id: number; type: string; title?: string; first_name?: string; username?: string };
    migrate_to_chat_id?: number;
  };
  my_chat_member?: {
    chat: { id: number; type: string; title?: string };
    new_chat_member?: { status?: string };
  };
};

const say = (chatId: number | string, text: string) => tg("sendMessage", { chat_id: chatId, text });

/** Apply one Telegram update. Returns what happened, for tests and logs. */
export async function handleUpdate(u: Update): Promise<string> {
  // The bot was removed from a chat: stop sending there.
  const mcm = u.my_chat_member;
  if (mcm && ["left", "kicked"].includes(mcm.new_chat_member?.status || "")) {
    await removeChat(String(mcm.chat.id));
    return "removed (bot left chat)";
  }

  const m = u.message;
  if (!m) return "ignored";

  // A group became a supergroup: its ID changed.
  if (m.migrate_to_chat_id) {
    await replaceChatId(String(m.chat.id), String(m.migrate_to_chat_id));
    return "migrated";
  }

  const text = (m.text || "").trim();
  const cmd = text.match(/^\/(start|connect|stop)(?:@\w+)?(?:\s+(\S+))?/i);
  if (!cmd) return "ignored";
  const [, command, arg] = cmd;
  const id = String(m.chat.id);
  const known = (await listChats()).some((c) => c.id === id);

  if (command.toLowerCase() === "stop") {
    if (known) {
      await removeChat(id);
      await say(id, "Stopped. This chat will no longer get DO Supply lead alerts.");
      return "disconnected";
    }
    return "ignored";
  }

  if (!arg || !same(arg, connectCode())) {
    // Same reply for a missing and a wrong code: reveal nothing.
    if (!known) await say(id, "This bot sends DO Supply sales alerts. To subscribe, use the Connect link on the DO Supply dashboard.");
    else await say(id, "This chat already gets DO Supply lead alerts. Send /stop to unsubscribe.");
    return "rejected";
  }

  const chat: Omit<TelegramChat, "connectedAt"> = {
    id,
    type: m.chat.type,
    title: m.chat.title || m.chat.first_name || m.chat.username,
  };
  await addChat(chat);
  await say(id, "✅ Connected. DO Supply lead alerts will be sent to this chat. Send /stop to unsubscribe.");
  return known ? "reconnected" : "connected";
}

export type ConnectionState = {
  bot?: string;
  chats: TelegramChat[];
  webhook?: { url?: string; pending?: number; lastError?: string };
  links?: { group: string; private: string };
  problem?: string;
};

export async function connectionState(): Promise<ConnectionState> {
  const chats = await listChats();
  if (!token()) return { chats, problem: "TELEGRAM_BOT_TOKEN is not set on this server." };
  const me = await tg<{ username?: string }>("getMe");
  if (!me.ok || !me.result?.username) return { chats, problem: `Telegram rejected the bot token (${me.description}).` };
  const username = me.result.username;
  const info = await tg<{ url?: string; pending_update_count?: number; last_error_message?: string }>("getWebhookInfo");
  const code = connectCode();
  return {
    bot: `@${username}`,
    chats,
    webhook: info.ok
      ? { url: info.result?.url || undefined, pending: info.result?.pending_update_count, lastError: info.result?.last_error_message }
      : undefined,
    links: {
      group: `https://t.me/${username}?startgroup=${code}`,
      private: `https://t.me/${username}?start=${code}`,
    },
  };
}

/** Point the bot's webhook at this site. The URL must be public HTTPS. */
export async function setupWebhook(origin: string): Promise<{ ok: boolean; url: string; error?: string }> {
  const url = `${origin.replace(/\/+$/, "")}/api/telegram/webhook`;
  if (!url.startsWith("https://")) {
    return { ok: false, url, error: "Telegram only delivers webhooks to https URLs. Open the dashboard from the deployed https domain." };
  }
  const r = await tg("setWebhook", {
    url,
    secret_token: webhookSecret(),
    allowed_updates: ["message", "my_chat_member"],
    drop_pending_updates: true,
  });
  return r.ok ? { ok: true, url } : { ok: false, url, error: r.description };
}
