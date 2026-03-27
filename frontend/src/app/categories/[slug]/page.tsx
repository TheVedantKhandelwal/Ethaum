"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { SkeletonProductCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("credibility");

  useEffect(() => {
    fetch(`${API_BASE}/api/categories/${slug}?sort=${sort}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, sort]);

  const category = data?.category;
  const products = data?.products || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-surface-600">
        <Link href="/categories" className="hover:text-surface-800">Categories</Link>
        <span>/</span>
        <span className="text-surface-950">{category?.name || slug}</span>
      </div>

      {category && (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-950">{category.name}</h1>
            {category.description && (
              <p className="text-sm text-surface-600 mt-1 max-w-2xl">{category.description}</p>
            )}
          </div>
          <Badge variant="brand">{category.product_count} products</Badge>
        </div>
      )}

      {/* Subcategories */}
      {category?.children?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {category.children.map((child: any) => (
            <Link key={child.id} href={`/categories/${child.slug}`}>
              <Badge variant="outline" className="hover:bg-surface-200 cursor-pointer">
                {child.name} ({child.product_count})
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-surface-600">Sort by:</span>
        {["credibility", "rating", "recent", "name"].map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              sort === s
                ? "bg-brand-600/15 text-brand-400"
                : "text-surface-700 hover:bg-surface-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Products */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonProductCard key={i} />)}
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-2">
          {products.map((product: any) => (
            <Link key={product.id} href={`/products/${product.slug}`}>
              <Card hover className="flex items-center gap-4 !p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-base font-bold text-brand-400">
                  {product.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-surface-950">{product.name}</h3>
                  <p className="text-xs text-surface-600 truncate">{product.tagline}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-400">
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-medium">
                        {product.credibility_score ? (product.credibility_score * 5).toFixed(1) : "N/A"}
                      </span>
                    </div>
                    <p className="text-[10px] text-surface-600">{product.stage} stage</p>
                  </div>
                  <Badge variant="outline" size="sm">{product.category}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📂"
          title="No products yet"
          description="No products have been listed in this category yet."
        />
      )}
    </div>
  );
}
