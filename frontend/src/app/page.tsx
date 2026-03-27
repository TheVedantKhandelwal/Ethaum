"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonProductCard } from "@/components/ui/skeleton";
import { getLaunches, getProducts, getDeals } from "@/lib/api";

export default function HomePage() {
  const [launches, setLaunches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getLaunches("trending").catch(() => []),
      getProducts("limit=8").catch(() => []),
      getDeals().catch(() => []),
    ]).then(([l, p, d]) => {
      setLaunches(l.slice(0, 5));
      setProducts(p.slice(0, 8));
      setDeals(d.slice(0, 4));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-surface-300 bg-gradient-to-br from-brand-950 via-surface-100 to-surface-50 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <Badge variant="brand" className="mb-4">AI-Powered Marketplace</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-surface-950 mb-3">
            Discover, Compare & Buy <br />
            <span className="text-gradient">the Best SaaS Tools</span>
          </h1>
          <p className="text-surface-700 text-base mb-6 max-w-lg">
            Product launches, verified reviews, market intelligence, and exclusive deals — all in one platform, powered by AI.
          </p>
          <div className="flex gap-3">
            <Link href="/discover">
              <Button size="lg">AI Discovery</Button>
            </Link>
            <Link href="/launches">
              <Button size="lg" variant="outline">Explore Launches</Button>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-brand-600/5 to-transparent" />
      </section>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Products Listed", value: "150+", icon: "📦" },
          { label: "Verified Reviews", value: "2,400+", icon: "⭐" },
          { label: "Active Deals", value: `${deals.length}+`, icon: "🏷️" },
          { label: "AI Insights", value: "Real-time", icon: "🤖" },
        ].map((stat) => (
          <Card key={stat.label} className="flex items-center gap-3 !p-4">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className="text-lg font-bold text-surface-950">{stat.value}</p>
              <p className="text-xs text-surface-600">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Trending Launches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-950">Trending Launches</h2>
            <p className="text-sm text-surface-600">Today&apos;s hottest product launches</p>
          </div>
          <Link href="/launches">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </div>
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonProductCard key={i} />)
            : launches.map((launch, index) => (
                <Link key={launch.id} href={`/products/${launch.product_slug || launch.slug || ""}`}>
                  <Card hover className="flex items-center gap-4 !p-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-200 text-sm font-bold text-surface-700">
                      {index + 1}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-lg">
                      🚀
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-surface-950 truncate">
                        {launch.title || launch.product_name}
                      </h3>
                      <p className="text-xs text-surface-600 truncate">
                        {launch.tagline || launch.ai_tagline || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {launch.category && (
                        <Badge variant="outline" size="sm">{launch.category}</Badge>
                      )}
                      <div className="flex items-center gap-1 rounded-lg border border-surface-400 px-3 py-1.5 text-sm font-medium text-surface-800 hover:bg-surface-200 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        {launch.upvote_count || 0}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
          }
        </div>
      </section>

      {/* Top Products Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-950">Top Products</h2>
            <p className="text-sm text-surface-600">Highest credibility scores</p>
          </div>
          <Link href="/products">
            <Button variant="ghost" size="sm">Browse all</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonProductCard key={i} />)
            : products.slice(0, 4).map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <Card hover className="space-y-3 !p-5 h-full">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-lg font-bold text-brand-400">
                        {product.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-surface-950 truncate">{product.name}</h3>
                        <p className="text-xs text-surface-600 truncate">{product.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-amber-400">
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs font-medium">{product.credibility_score ? (product.credibility_score * 5).toFixed(1) : "N/A"}</span>
                      </div>
                      <span className="text-xs text-surface-500">|</span>
                      <span className="text-xs text-surface-600">{product.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(product.features?.list || []).slice(0, 3).map((f: string) => (
                        <Badge key={f} variant="outline" size="sm">{f}</Badge>
                      ))}
                    </div>
                  </Card>
                </Link>
              ))
          }
        </div>
      </section>

      {/* Deals Section */}
      {deals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-950">Active Deals</h2>
              <p className="text-sm text-surface-600">Exclusive discounts and lifetime offers</p>
            </div>
            <Link href="/deals">
              <Button variant="ghost" size="sm">View all deals</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {deals.slice(0, 4).map((deal) => (
              <Link key={deal.id} href="/deals">
                <Card hover className="space-y-3 !p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant={deal.deal_type === "lifetime" ? "award" : "brand"} size="sm">
                      {deal.deal_type}
                    </Badge>
                    {deal.original_price > 0 && (
                      <span className="text-xs text-emerald-400 font-medium">
                        {Math.round((1 - deal.deal_price / deal.original_price) * 100)}% off
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-surface-950 truncate">{deal.title || deal.product_name}</h3>
                  <div className="flex items-baseline gap-2">
                    {deal.deal_price > 0 ? (
                      <>
                        <span className="text-xl font-bold text-surface-950">${deal.deal_price}</span>
                        <span className="text-sm text-surface-600 line-through">${deal.original_price}</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-emerald-400">Free</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-surface-600">
                    <span>{deal.current_redemptions}/{deal.max_redemptions} claimed</span>
                    <div className="h-1.5 w-20 rounded-full bg-surface-300">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.min((deal.current_redemptions / deal.max_redemptions) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="rounded-2xl border border-surface-300 bg-gradient-to-r from-brand-950 to-surface-100 p-8 text-center">
        <h2 className="text-2xl font-bold text-surface-950 mb-2">Ready to find your perfect SaaS stack?</h2>
        <p className="text-surface-700 mb-6">Our AI analyzes thousands of products to match your exact needs.</p>
        <Link href="/discover">
          <Button size="lg">Start AI Discovery</Button>
        </Link>
      </section>
    </div>
  );
}
