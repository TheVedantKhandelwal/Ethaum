"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { getProducts } from "@/lib/api";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await getProducts(`search=${encodeURIComponent(query)}&limit=5`);
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={ref} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 transition-colors focus-within:border-brand-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-500">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search products..."
            className="ml-2 w-32 bg-transparent text-sm outline-none placeholder:text-gray-400 lg:w-48"
          />
        </div>
      </form>

      {open && results.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                {p.name[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                <p className="truncate text-xs text-gray-500">{p.tagline}</p>
              </div>
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2 text-center text-xs font-medium text-brand-600 hover:bg-gray-50"
          >
            View all results
          </Link>
        </div>
      )}
    </div>
  );
}
