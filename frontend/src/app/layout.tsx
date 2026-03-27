import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchDeck — AI-Powered SaaS Marketplace",
  description:
    "Discover, compare, and validate SaaS tools. Product launches, verified reviews, market insights, and exclusive deals — all powered by AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-0 text-surface-950">
        <UserProvider>
          <Sidebar />
          <div className="lg:pl-[220px]">
            <Topbar />
            <main className="min-h-[calc(100vh-3.5rem)] pb-16 lg:pb-0">{children}</main>
          </div>
          <MobileNav />
        </UserProvider>
      </body>
    </html>
  );
}
