"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/user-context";

export function Topbar() {
  const { currentUser, isLoggedIn, logout } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-300 bg-surface-50/80 backdrop-blur-xl px-6 lg:pl-[232px]">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          E
        </div>
        <span className="text-base font-bold text-surface-950">
          Eth<span className="text-brand-400">Aum</span>
        </span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-lg">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-600"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, categories, deals..."
            className="h-9 w-full rounded-lg border border-surface-300 bg-surface-100 pl-9 pr-4 text-sm text-surface-950 placeholder:text-surface-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-surface-400 bg-surface-200 px-1.5 py-0.5 text-[10px] text-surface-600">
            /
          </kbd>
        </div>
      </form>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <Link href="/launches/new">
          <Button size="sm" variant="primary">
            Submit Product
          </Button>
        </Link>

        {isLoggedIn ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-200 transition-colors"
            >
              <Avatar name={currentUser.name} size="sm" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-surface-300 bg-surface-100 py-1 shadow-xl animate-fade-in">
                <div className="px-3 py-2 border-b border-surface-300">
                  <p className="text-sm font-medium text-surface-950">{currentUser.name}</p>
                  <p className="text-xs text-surface-600">{currentUser.role}</p>
                </div>
                <Link href="/dashboard" className="block px-3 py-2 text-sm text-surface-800 hover:bg-surface-200">
                  Dashboard
                </Link>
                <Link href="/settings" className="block px-3 py-2 text-sm text-surface-800 hover:bg-surface-200">
                  Settings
                </Link>
                <button
                  onClick={() => { logout(); setShowDropdown(false); }}
                  className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-surface-200"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="ghost">Sign in</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
