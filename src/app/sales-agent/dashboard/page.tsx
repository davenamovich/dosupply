import type { Metadata } from "next";
import Dashboard from "@/components/sales/dashboard";

export const metadata: Metadata = { title: "DO Supply Sales Dashboard" };

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black/30 text-zinc-100">
      <Dashboard />
    </div>
  );
}
