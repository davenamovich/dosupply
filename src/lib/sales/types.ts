export type Availability = "In Stock" | "Limited" | "Lead Time" | "Obsolete / Sourcing";

export type Product = {
  id: string;
  manufacturer: string;
  partNumber: string;
  name: string;
  category: string;
  description: string;
  availability: Availability;
  /** Only shown when authorized; demo values are simulated. */
  qtyAvailable?: number;
  /** Never invented. Demo catalog leaves this empty so prices come from a quote. */
  price?: number;
  imageUrl?: string;
  productUrl?: string;
  /** Alternate / cross-referenced part numbers (not a compatibility claim). */
  relatedParts?: string[];
  /** A candidate alternative that sales must verify; never claimed as interchangeable. */
  possibleAlternative?: { partNumber: string; note: string };
  keywords?: string[];
  /** True for every record that comes from the built-in sample catalog. */
  demo: boolean;
};

export type MatchType = "exact" | "possible" | "none";

export type LookupResult = {
  query: string;
  matchType: MatchType;
  products: Product[];
  /** Which provider answered: live-api | database | csv | demo | none. */
  source: string;
  /** False for anything that is not a live DO Supply system. */
  verified: boolean;
  checkedAt: string;
};

export type Condition = "New" | "New Surplus" | "Refurbished" | "Used" | "No preference";

export type RequestItem = {
  id: string;
  manufacturer?: string;
  partNumber?: string;
  description?: string;
  quantity?: number;
  condition?: Condition;
  replacement?: boolean;
  lookup?: LookupResult;
  /** Internal: the quantity question has been asked for this item. */
  qtyAsked?: boolean;
  /** Internal: we already asked this description-only item for a part number. */
  partAsked?: boolean;
};

export type Customer = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  shipping?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: string;
  cards?: Product[];
  quickReplies?: string[];
};

export type AskKey = "part" | "qty" | "condition" | "email" | "identity";

export type Session = {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  items: RequestItem[];
  customer: Customer;
  humanRequested: boolean;
  replacementIntent: boolean;
  additionalNotes: string[];
  awaiting?: AskKey;
  /** How many times each question has been asked. Used to never repeat one. */
  asked: Partial<Record<AskKey, number>>;
  /** Item the last qty/condition question was about. */
  focusItemId?: string;
  leadId?: string;
};

export type LeadStatus = "New" | "Notified" | "Contacted" | "Quoted" | "Won" | "Lost";
export const LEAD_STATUSES: LeadStatus[] = ["New", "Notified", "Contacted", "Quoted", "Won", "Lost"];

export type LeadKind =
  | "New Quote Request"
  | "Sourcing Request"
  | "Replacement Request"
  | "Sales Callback Request";

export type TelegramState = {
  /** sent = Telegram confirmed delivery. simulated = no credentials configured. */
  status: "pending" | "sent" | "simulated" | "failed";
  attempts: number;
  lastAttemptAt?: string;
  sentAt?: string;
  error?: string;
  message: string;
};

export type Lead = {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  kind: LeadKind;
  status: LeadStatus;
  customer: Customer;
  items: RequestItem[];
  transcript: ChatMessage[];
  summary: string;
  telegram: TelegramState;
  /** Set when the customer added details after the alert already went out. */
  updatedAfterAlert: boolean;
  source: "Website AI Sales Agent";
};
