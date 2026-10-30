import type { Metadata } from "next";
import Dashboard from "@/components/sales/dashboard";

export const metadata: Metadata = { title: "DO Supply Sales Dashboard" };

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFD] text-[#0B1F3A]">
      <Dashboard />
    </div>
  );
}
