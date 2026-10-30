import type { Metadata } from "next";
import Deck from "@/components/outlook/deck";

export const metadata: Metadata = {
  title: "Future Outlook — DO Supply growth opportunity",
  description:
    "The AI-assisted growth opportunity for DO Supply: a market view, a search-led strategy, a five-year scenario range and a 90-day pilot.",
};

export default function FutureOutlookPage() {
  return <Deck />;
}
