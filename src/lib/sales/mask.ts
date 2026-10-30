import type { ChatMessage, Lead } from "./types";

/**
 * The dashboard opens without a password so anyone can see the demo work, but
 * real visitors can type real email addresses and phone numbers into the chat.
 * The public view therefore hides contact details everywhere they can appear.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\+\d[\d\s().-]{8,}\d/g;

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return domain ? `${user.slice(0, 1)}***@${domain}` : "***";
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : "***";
}

/** Mask every email address and phone number inside free text. */
export function maskText(text: string): string {
  return text.replace(EMAIL, (m) => maskEmail(m)).replace(PHONE, (m) => maskPhone(m));
}

function maskMessage(m: ChatMessage): ChatMessage {
  return { ...m, text: maskText(m.text) };
}

export function maskLead(lead: Lead): Lead {
  return {
    ...lead,
    customer: {
      ...lead.customer,
      email: lead.customer.email ? maskEmail(lead.customer.email) : undefined,
      phone: lead.customer.phone ? maskPhone(lead.customer.phone) : undefined,
    },
    transcript: lead.transcript.map(maskMessage),
    summary: maskText(lead.summary),
    telegram: { ...lead.telegram, message: maskText(lead.telegram.message) },
  };
}
