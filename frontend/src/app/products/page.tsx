"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getProducts, getCategories } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonProductCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, SlidersHorizontal, ChevronDown, Star } from "lucide-react";

const SORT_OPTIONS = [
  { value: "credibility", label: "Credibility Score" },
  { value: "rating", label: "Avg Rating" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A-Z" },
];

const PAGE_SIZE = 12;

export default function ProductsBrowsePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("credibility");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const buildParams = useCallback(
    (currentOffset: number) => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(currentOffset));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedCategory) params.set("category", selectedCategory);
      if (sortBy) params.set("sort", sortBy);
      return params.toString();
    },
    [searchQuery, selectedCategory, sortBy]
  );

  // Load categories on mount
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => []);
  }, []);

  // Load products when filters change
  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    getProducts(buildParams(0))
      .then((data) => {
        setProducts(data);
        setHasMore(data.length >= PAGE_SIZE);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [buildParams]);

  const handleLoadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await getProducts(buildParams(nextOffset));
      setProducts((prev) => [...prev, ...data]);
      setOffset(nextOffset);
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === sortBy)?.label || "Sort";

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Browse Products</h1>
        <p className="mt-1 text-sm text-surface-600">
          Discover and compare the best SaaS tools, validated by AI
        </p>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600"
          />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
          >
            <SlidersHorizontal size={14} />
            {currentSortLabel}
            <ChevronDown size={14} />
          </Button>
          {showSortDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSortDropdown(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-surface-300 bg-surface-100 py-1 shadow-xl">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSortDropdown(false);
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                      sortBy === opt.value
                        ? "bg-brand-600/10 text-brand-400"
                        : "text-surface-800 hover:bg-surface-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === null
                ? "bg-brand-600 text-white"
                : "bg-surface-200 text-surface-800 hover:bg-surface-300"
            }`}
          >
            All
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.slug || cat.name}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === (cat.slug || cat.name)
                    ? null
                    : cat.slug || cat.name
                )
              }
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === (cat.slug || cat.name)
                  ? "bg-brand-600 text-white"
                  : "bg-surface-200 text-surface-800 hover:bg-surface-300"
              }`}
            >
              {cat.name}
              {cat.product_count !== undefined && (
                <span className="ml-1 opacity-60">({cat.product_count})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No products found"
          description="Try adjusting your search or filters to find what you are looking for."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(null);
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card hover className="h-full space-y-3 !p-5">
                  {/* Product Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-lg font-bold text-brand-400">
                      {product.name?.[0] || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-surface-950">
                        {product.name}
                      </h3>
                      <p className="truncate text-xs text-surface-600">
                        {product.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    {product.category && (
                      <Badge variant="outline" size="sm">
                        {product.category}
                      </Badge>
                    )}
                  </div>

                  {/* Rating + Credibility Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {/* Star rating display */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i < Math.round(product.avg_rating || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-surface-400"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-surface-700">
                        {product.avg_rating
                          ? product.avg_rating.toFixed(1)
                          : "N/A"}
                      </span>
                      {product.review_count > 0 && (
                        <span className="text-xs text-surface-600">
                          ({product.review_count})
                        </span>
                      )}
                    </div>

                    {/* Credibility Score */}
                    {product.credibility_score != null && (
                      <div className="flex items-center gap-1.5 rounded-md bg-brand-600/10 px-2 py-0.5">
                        <span className="text-xs font-bold text-brand-400">
                          {(product.credibility_score * 100).toFixed(0)}
                        </span>
                        <span className="text-[10px] text-brand-400/70">
                          credibility
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Feature Badges */}
                  {product.features?.list?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.features.list.slice(0, 3).map((f: string) => (
                        <Badge key={f} variant="outline" size="sm">
                          {f}
                        </Badge>
                      ))}
                      {product.features.list.length > 3 && (
                        <Badge variant="outline" size="sm">
                          +{product.features.list.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More Products"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
