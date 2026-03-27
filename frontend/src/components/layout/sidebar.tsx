"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/launches", label: "Launches", icon: "🚀" },
  { href: "/products", label: "Products", icon: "📦" },
  { href: "/categories", label: "Categories", icon: "📂" },
  { href: "/compare", label: "Compare", icon: "⚖️" },
  { href: "/deals", label: "Deals", icon: "🏷️" },
  { href: "/insights", label: "Insights", icon: "📊" },
  { href: "/discover", label: "AI Discover", icon: "✨" },
];

const bottomItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📈" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col border-r border-surface-300 bg-surface-50 lg:flex">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-surface-300 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          E
        </div>
        <span className="text-base font-bold text-surface-950">
          Eth<span className="text-brand-400">Aum</span>
          <span className="text-surface-600 text-xs">.ai</span>
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-600">
          Discover
        </p>
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600/10 text-brand-400"
                  : "text-surface-700 hover:bg-surface-200 hover:text-surface-950"
              )}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-surface-300 px-3 py-3 space-y-0.5">
        {bottomItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600/10 text-brand-400"
                  : "text-surface-700 hover:bg-surface-200 hover:text-surface-950"
              )}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
