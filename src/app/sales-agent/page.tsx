import type { Metadata } from "next";
import SalesChat from "@/components/sales/chat";

export const metadata: Metadata = {
  title: "DO Supply Sales Assistant",
  description:
    "An AI sales representative that works the quote conversation: finds the part, checks inventory, captures the lead and alerts the sales team.",
};

export default function SalesAgentPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1F3A]">
      <SalesChat />
      <p className="pb-6 text-center text-[11px] text-slate-400">
        Standalone demo. Not connected to the DO Supply website, quote form or production inventory.
      </p>
    </div>
  );
}
