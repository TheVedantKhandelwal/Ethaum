"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/layout/search-bar";
import { useUser } from "@/lib/user-context";

const navLinks = [
  { href: "/launches", label: "Launches" },
  { href: "/discover", label: "Discover" },
  { href: "/compare", label: "Compare" },
  { href: "/insights", label: "Insights" },
  { href: "/deals", label: "Deals" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, currentUser, isLoggedIn, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            E
          </div>
          <span className="text-xl font-bold text-gray-900">
            Eth<span className="text-brand-600">Aum</span>.ai
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href || pathname?.startsWith(link.href + "/")
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SearchBar />

          {!isLoggedIn && (
            /* Role switcher (demo mode) */
            <div className="hidden items-center rounded-lg border border-gray-200 p-0.5 sm:flex">
              <button
                onClick={() => setRole("buyer")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  role === "buyer"
                    ? "bg-brand-600 text-white"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Buyer
              </button>
              <button
                onClick={() => setRole("vendor")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  role === "vendor"
                    ? "bg-brand-600 text-white"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Vendor
              </button>
            </div>
          )}

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-gray-600 sm:inline">
                {currentUser.name}
              </span>
              <Link
                href={role === "vendor" ? "/dashboard" : "/launches/new"}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                {role === "vendor" ? "Dashboard" : "Submit Launch"}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={role === "vendor" ? "/dashboard" : "/launches/new"}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                {role === "vendor" ? "Dashboard" : "Submit Launch"}
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
