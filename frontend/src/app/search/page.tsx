"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { SkeletonProductCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getProducts, getLaunches, getDeals } from "@/lib/api";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState<any[]>([]);
  const [launches, setLaunches] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      getProducts(`search=${encodeURIComponent(query)}`).catch(() => []),
      getLaunches("trending").catch(() => []),
      getDeals().catch(() => []),
    ]).then(([p, l, d]) => {
      setProducts(p);
      const q = query.toLowerCase();
      setLaunches(l.filter((item: any) =>
        (item.title || "").toLowerCase().includes(q) ||
        (item.product_name || "").toLowerCase().includes(q)
      ));
      setDeals(d.filter((item: any) =>
        (item.title || "").toLowerCase().includes(q) ||
        (item.product_name || "").toLowerCase().includes(q)
      ));
      setLoading(false);
    });
  }, [query]);

  const tabs = [
    { id: "products", label: "Products", count: products.length },
    { id: "launches", label: "Launches", count: launches.length },
    { id: "deals", label: "Deals", count: deals.length },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-950">
          {query ? `Results for "${query}"` : "Search"}
        </h1>
        <p className="text-sm text-surface-600 mt-1">
          {loading ? "Searching..." : `${products.length + launches.length + deals.length} results found`}
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonProductCard key={i} />)}
        </div>
      ) : (
        <>
          {activeTab === "products" && (
            products.length > 0 ? (
              <div className="space-y-2">
                {products.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`}>
                    <Card hover className="flex items-center gap-4 !p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-base font-bold text-brand-400">
                        {p.name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-surface-950">{p.name}</h3>
                        <p className="text-xs text-surface-600 truncate">{p.tagline}</p>
                      </div>
                      <Badge variant="outline" size="sm">{p.category}</Badge>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon="🔍" title="No products found" description={`No products matching "${query}"`} />
            )
          )}

          {activeTab === "launches" && (
            launches.length > 0 ? (
              <div className="space-y-2">
                {launches.map((l) => (
                  <Link key={l.id} href={`/products/${l.product_slug || ""}`}>
                    <Card hover className="flex items-center gap-4 !p-4">
                      <span className="text-lg">🚀</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-surface-950">{l.title}</h3>
                        <p className="text-xs text-surface-600 truncate">{l.tagline}</p>
                      </div>
                      <span className="text-sm text-surface-700">{l.upvote_count} upvotes</span>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon="🚀" title="No launches found" description={`No launches matching "${query}"`} />
            )
          )}

          {activeTab === "deals" && (
            deals.length > 0 ? (
              <div className="space-y-2">
                {deals.map((d) => (
                  <Card key={d.id} hover className="flex items-center gap-4 !p-4">
                    <span className="text-lg">🏷️</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-surface-950">{d.title}</h3>
                      <p className="text-xs text-surface-600">{d.deal_type}</p>
                    </div>
                    <span className="text-sm font-bold text-surface-950">${d.deal_price}</span>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon="🏷️" title="No deals found" description={`No deals matching "${query}"`} />
            )
          )}
        </>
      )}
    </div>
  );
}
