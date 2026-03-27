"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/launches", label: "Launches", icon: "🚀" },
  { href: "/products", label: "Products", icon: "📦" },
  { href: "/deals", label: "Deals", icon: "🏷️" },
  { href: "/discover", label: "AI", icon: "✨" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-surface-300 bg-surface-50/95 backdrop-blur-lg py-2 lg:hidden">
      {items.map((item) => {
        const isActive = item.href === "/"
          ? pathname === "/"
          : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
              isActive ? "text-brand-400" : "text-surface-600"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
