# DO Supply × Plunder & Riffle — AI Marketing Engine

A demo marketing engine for DO Supply (industrial automation replacement parts). One product or
topic goes in; social posts, video scripts, email campaigns, SEO copy, review responses and a
10-format content package come out, all grounded in verified brand facts.

## Stack

- **Next.js** (App Router, React 19) with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **Prisma** — schema under `prisma/`, local SQLite database
- **Bun** as package manager and runtime; **Dockerfile** for deployment

## Quick start

```bash
bun install
cp .env.example .env      # then fill in the values
bun run dev               # http://localhost:3000
```

On Windows you can also double-click `launch.bat`, which starts the app on port 3000.

## Environment variables

Copy `.env.example` to `.env` and fill it in. Everything is read server-side only — no variable is
exposed to the browser. Never commit `.env`; it is gitignored.

### LLM provider (required)

`/api/generate` calls any **OpenAI-compatible** `/chat/completions` endpoint, so you can point it at
whichever provider you want (DeepSeek, Groq, OpenRouter, GLM, Gemini's OpenAI-compatible endpoint,
a self-hosted gateway, …).

| Variable       | Required | Purpose                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `LLM_BASE_URL` | yes      | Base URL, e.g. `https://api.deepseek.com/v1`. `/chat/completions` is appended unless already present. |
| `LLM_API_KEY`  | yes      | Sent as `Authorization: Bearer <key>`.                                   |
| `LLM_MODEL`    | yes      | Model name, e.g. `deepseek-chat`.                                       |

If any of the three is missing, the route fails fast with an explicit message naming the missing
variables rather than falling back to a default provider.

### Web research (optional)

`/api/research` grounds generation in live search results. At least one provider is needed for the
"Research on the web" button; Exa is tried first, TinyFish is the fallback.

| Variable               | Required | Purpose                                                          |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| `EXA_API_KEY`          | optional | Primary research provider (Exa).                                  |
| `TINYFISH_API_KEY`     | optional | Fallback search provider (free to 12k requests/day).              |
| `TINYFISH_SEARCH_URL`  | optional | Override the search endpoint; defaults to `https://api.search.tinyfish.ai`. |

### Plunder & Riffle MCP (optional)

| Variable                  | Required | Purpose                                            |
| ------------------------- | -------- | -------------------------------------------------- |
| `PLUNDER_RIFFLE_API_KEY`  | optional | Bearer token for the P&R MCP engine.               |
| `PLUNDER_RIFFLE_MCP_URL`  | optional | Override the MCP endpoint; defaults to `https://bot.plunderandriffle.com/api/mcp`. |

### Setup panel

| Variable         | Required | Purpose                                                                   |
| ---------------- | -------- | ------------------------------------------------------------------------- |
| `ADMIN_PASSCODE` | yes (to use the panel) | Gates saving and clearing BYOK keys. There is no default — with it unset, the panel stays locked. |

### Runtime

| Variable | Required | Purpose                                                            |
| -------- | -------- | ------------------------------------------------------------------ |
| `PORT`   | Railway  | Injected by the platform; the standalone server listens on it (3000 locally). |

## Keys: env vars vs the setup panel

Both P&R and Exa keys resolve in this order:

1. **Runtime store** — `db/runtime-keys.json`, written by the setup panel (mode `0600`).
2. **Environment variable** — `PLUNDER_RIFFLE_API_KEY` / `EXA_API_KEY`.

The panel only ever returns masked previews. Saving a P&R key verifies it against the engine with a
real auth-gated `tools/call` before storing it. Container filesystems are ephemeral, so on Railway
prefer environment variables; the runtime file is for local or single-instance use.

### Saving a key from the setup panel

No screenshots needed — the tab has five controls.

1. Open the app and select the **BYOK Setup** tab (the fifth tab, key icon).
2. In **Setup passcode**, type the value of `ADMIN_PASSCODE`. Keep it filled in: every save and
   clear reuses the same field.
3. Paste the key into **Plunder & Riffle API key** (`pr_live_…`) or **Exa API key** (UUID). The eye
   button toggles between dots and plain text so you can check what you pasted.
4. Click **Save & verify**. It stays disabled until the passcode is non-empty and the key is longer
   than 8 characters, so a greyed-out button means one of those is missing.
5. Read the banner:
   - P&R — `P&R key saved and verified against bot.plunderandriffle.com. Account: …` means the
     engine was actually called with your key.
   - Exa — `Exa key saved (ok). Research now runs through api.exa.ai.`
6. The status card above the form flips to configured with a masked preview, and the key field
   clears itself. Nothing ever renders the raw key back to the browser.

What the banners mean when something goes wrong:

| Banner | Cause |
| --- | --- |
| `Invalid setup passcode.` (HTTP 401) | `ADMIN_PASSCODE` is unset on the server, or the passcode is mistyped. There is no default value. |
| `P&R key rejected by bot.plunderandriffle.com: … Nothing was saved.` | The key is invalid or revoked. The existing stored key is left untouched. |
| `Saving the key failed.` | Network or server error; nothing changed. |

Saving writes the **runtime store**, which takes precedence over the environment variable. The env
var is not modified, so it becomes active again as soon as you clear the stored key.

### Clearing a stored key

Once a key is configured, a **Clear** button appears beside it. Clearing needs the same passcode and
removes only the runtime entry: if `PLUNDER_RIFFLE_API_KEY` or `EXA_API_KEY` is also set, the app
immediately falls back to that value.

## API routes

| Route           | Method        | Notes                                                        |
| --------------- | ------------- | ------------------------------------------------------------ |
| `/`             | GET           | The marketing studio UI.                                     |
| `/api/generate` | POST          | Mode-switched content generation (`social`, `video`, `email`, `seo`, `reputation`, `multiplier`). Rate limited per IP. |
| `/api/research` | GET / POST    | Provider badge; live web search grounding.                   |
| `/api/keys`     | GET / POST / DELETE | Masked key status; save and clear keys (passcode-gated). |
| `/api/status`   | GET           | MCP connection, key sources, active research provider.       |

## DO Supply Sales Agent (`/sales-agent`)

A standalone AI sales assistant that works the quote conversation instead of a one-way form: it
identifies the part, searches inventory, asks only what is missing, saves the lead with the full
transcript and alerts the sales team on Telegram the moment the lead is qualified. It does not touch
the DO Supply website or its quote form.

| URL                       | What it is                                                            |
| ------------------------- | --------------------------------------------------------------------- |
| `/sales-agent`            | Customer chat, plus six one-click sample conversations.               |
| `/sales-agent/dashboard`  | Internal leads dashboard: transcript, inventory result, Telegram alert, follow-up status. |

**Modules** (`src/lib/sales/`): `engine.ts` (conversation), `extract.ts` (part numbers, quantities,
contact details), `inventory.ts` (provider chain), `conversation.ts` (lead qualification),
`store.ts` (lead database), `telegram.ts` (alerts), `demo-products.ts` (30 sample parts).

**Telegram.** Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. A lead is alerted once, immediately
after it has an email and a part requirement. Failed sends are retried (3 attempts, then again on
later traffic or from the dashboard's *Retry now*), and the customer is only told the alert went out
if Telegram confirmed delivery. With no credentials the alert is simulated and shown on the dashboard.

**Inventory.** Providers are tried in order: `DOSUPPLY_CATALOG_API_URL` (live; the only one treated
as verified), a database hook, `INVENTORY_CSV_PATH`, then built-in **DEMO DATA**. Prices, quantities
and compatibility are never invented; the demo catalog carries no prices.

**Storage.** Leads live in `db/sales-leads.json` (gitignored). That is fine for a demo, but the
filesystem is ephemeral on Railway, so swap `store.ts` for a database before relying on it.

**Dashboard access.** Requires `ADMIN_PASSCODE` when set; with it unset the dashboard is open in
development and closed in production.

Test without a server: `bun run tests/sales-agent.ts`.

## Smoke test

One command checks that a running instance is healthy:

```bash
bun run smoke                                            # http://localhost:3000
bun run smoke https://dosupply-production.up.railway.app  # a deployed instance
SMOKE_BASE_URL=https://... bun run smoke                 # same, via env
```

It exercises `GET /api/status`, `POST /api/research` and a real `POST /api/generate` (one model
call and one search), prints PASS/FAIL per check, and exits non-zero if anything fails — so it can
gate a deploy. Override the sample query and input with `SMOKE_QUERY` / `SMOKE_INPUT`, and the
per-request timeout with `SMOKE_TIMEOUT_MS` (default 120000).

## Deploying on Railway

The `Dockerfile` builds the Next standalone output and runs `server.js` on `$PORT`.

1. Push the repo and create a Railway service from it (Dockerfile is detected automatically).
2. Set the variables above on the service — at minimum `LLM_BASE_URL`, `LLM_API_KEY`,
   `LLM_MODEL`, and `ADMIN_PASSCODE` if you need the setup panel.
3. Generate a public domain. Railway terminates TLS, so no proxy configuration is required.

`db/` is created during the build because the runtime store is gitignored, so a clean clone has no
such directory.

### Keep `package.json` and `bun.lock` in sync

The image installs dependencies with `bun install --frozen-lockfile`, which **fails the build** if
`package.json` and `bun.lock` disagree. Always commit both files together:

```bash
bun add <package>      # updates package.json and bun.lock
bun remove <package>   # updates both as well
```

Editing `package.json` by hand (or resolving a merge conflict in only one of the two files) leaves
the lockfile stale and breaks the Docker build, even though `bun run dev` keeps working locally
because it is happy to re-resolve.
