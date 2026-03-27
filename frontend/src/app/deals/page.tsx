"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDeals } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonProductCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeals()
      .then((data) => { setDeals(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? deals : deals.filter((d) => d.deal_type === filter);
  const endingSoon = deals.filter((d) => {
    if (!d.expires_at) return false;
    const diff = new Date(d.expires_at).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">Deals</h1>
          <p className="text-sm text-surface-600 mt-1">Exclusive discounts, lifetime offers, and free pilots</p>
        </div>
        <Link href="/deals/new">
          <Button variant="secondary">Create Deal</Button>
        </Link>
      </div>

      {/* Guarantee banner */}
      <Card className="flex items-center gap-4 !p-4 !bg-emerald-500/5 !border-emerald-500/20">
        <span className="text-3xl">🛡️</span>
        <div>
          <h3 className="text-sm font-semibold text-emerald-400">60-Day Money-Back Guarantee</h3>
          <p className="text-xs text-surface-600">Try risk-free. Full refund within 60 days if you&apos;re not satisfied.</p>
        </div>
      </Card>

      {/* Ending Soon */}
      {endingSoon.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-surface-950 mb-3 flex items-center gap-2">
            <span className="text-red-400">⏰</span> Ending Soon
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {endingSoon.slice(0, 3).map((deal) => (
              <DealCard key={deal.id} deal={deal} showUrgency />
            ))}
          </div>
        </section>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-surface-600">Filter:</span>
        {["all", "lifetime", "discount", "pilot"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-brand-600/15 text-brand-400"
                : "text-surface-700 hover:bg-surface-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Deals grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonProductCard key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <EmptyState icon="🏷️" title="No deals found" description="Check back later for new deals." />
      )}
    </div>
  );
}

function DealCard({ deal, showUrgency = false }: { deal: any; showUrgency?: boolean }) {
  const discount = deal.original_price > 0
    ? Math.round((1 - deal.deal_price / deal.original_price) * 100)
    : 0;

  const daysLeft = deal.expires_at
    ? Math.max(0, Math.ceil((new Date(deal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const progress = deal.max_redemptions > 0
    ? Math.min((deal.current_redemptions / deal.max_redemptions) * 100, 100)
    : 0;

  return (
    <Card hover className="flex flex-col !p-5 h-full">
      {/* Top badges */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant={deal.deal_type === "lifetime" ? "award" : deal.deal_type === "pilot" ? "success" : "brand"} size="sm">
          {deal.deal_type}
        </Badge>
        <div className="flex items-center gap-2">
          {discount > 0 && (
            <span className="text-xs font-semibold text-emerald-400">{discount}% off</span>
          )}
          {showUrgency && daysLeft !== null && daysLeft <= 7 && (
            <Badge variant="danger" size="sm">{daysLeft}d left</Badge>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-surface-950 mb-1 line-clamp-2">
        {deal.title || deal.product_name}
      </h3>
      {deal.description && (
        <p className="text-xs text-surface-600 mb-3 line-clamp-2">{deal.description}</p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pricing */}
      <div className="flex items-baseline gap-2 mb-3">
        {deal.deal_price > 0 ? (
          <>
            <span className="text-2xl font-bold text-surface-950">${deal.deal_price}</span>
            <span className="text-sm text-surface-600 line-through">${deal.original_price}</span>
            {deal.deal_type === "lifetime" && (
              <span className="text-[10px] text-surface-600">lifetime</span>
            )}
          </>
        ) : (
          <span className="text-2xl font-bold text-emerald-400">Free</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-[10px] text-surface-600">
          <span>{deal.current_redemptions} claimed</span>
          <span>{deal.max_redemptions - deal.current_redemptions} remaining</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-300">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <Button className="w-full" size="sm">
        {deal.deal_price > 0 ? "Get Deal" : "Start Free Pilot"}
      </Button>
    </Card>
  );
}
