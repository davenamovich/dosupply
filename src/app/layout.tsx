import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DO Supply × Plunder & Riffle — AI Marketing Engine",
  description:
    "One Product. Infinite Content Possibilities. An experimental AI marketing concept demonstrating what an AI-powered content engine could do for DO Supply.",
  keywords: [
    "DO Supply",
    "Plunder & Riffle",
    "AI marketing",
    "industrial automation",
    "content engine",
  ],
  authors: [{ name: "Dave — Founder, Plunder & Riffle" }],
  openGraph: {
    title: "DO Supply × Plunder & Riffle — AI Marketing Engine",
    description:
      "One Product. Infinite Content Possibilities. An interactive demonstration of an AI-powered marketing content engine.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
