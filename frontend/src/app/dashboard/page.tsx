"use client";

import { useEffect, useState } from "react";
import { getVendorDashboard } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardPage() {
  const { currentUser, role } = useUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVendorDashboard(currentUser.id)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <EmptyState icon="📊" title="No data available" description="Submit products and collect reviews to see your dashboard." />
      </div>
    );
  }

  const summary = data.summary || {};
  const sentiment = data.sentiment || {};
  const productStats = data.product_stats || [];
  const recentReviews = data.recent_reviews || [];
  const deals = data.deals || [];
  const boostStats = data.boost_stats || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Dashboard</h1>
        <p className="text-sm text-surface-600 mt-1">
          Welcome back, {data.user?.name || currentUser.name}
          {data.user?.company && <span className="text-surface-500"> · {data.user.company}</span>}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Products", value: summary.product_count || 0, icon: "📦", color: "brand" },
          { label: "Total Reviews", value: summary.total_reviews || 0, icon: "⭐", color: "amber" },
          { label: "Total Upvotes", value: summary.total_upvotes || 0, icon: "🔺", color: "emerald" },
          { label: "Deal Revenue", value: `$${(summary.deal_revenue || 0).toLocaleString()}`, icon: "💰", color: "violet" },
        ].map((stat) => (
          <Card key={stat.label} className="!p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-xl font-bold text-surface-950">{stat.value}</p>
                <p className="text-xs text-surface-600">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product stats */}
        <Card className="!p-5">
          <h3 className="text-sm font-semibold text-surface-950 mb-4">Product Performance</h3>
          <div className="space-y-3">
            {productStats.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-surface-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-sm font-bold text-brand-400">
                  {p.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-950 truncate">{p.name}</p>
                  <div className="flex items-center gap-3 text-[10px] text-surface-600 mt-0.5">
                    <span>⭐ {p.avg_rating ? p.avg_rating.toFixed(1) : "N/A"}</span>
                    <span>{p.review_count} reviews</span>
                    <span>🔺 {p.upvotes} upvotes</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-400">{(p.credibility_score * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-surface-600">credibility</p>
                </div>
              </div>
            ))}
            {productStats.length === 0 && (
              <p className="text-sm text-surface-600 text-center py-4">No products yet</p>
            )}
          </div>
        </Card>

        {/* Sentiment + Boost stats */}
        <div className="space-y-6">
          {/* Sentiment */}
          <Card className="!p-5">
            <h3 className="text-sm font-semibold text-surface-950 mb-4">Review Sentiment</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Positive", value: sentiment.positive || 0, color: "emerald" },
                { label: "Neutral", value: sentiment.neutral || 0, color: "amber" },
                { label: "Negative", value: sentiment.negative || 0, color: "red" },
              ].map((s) => (
                <div key={s.label}>
                  <p className={`text-2xl font-bold text-${s.color}-400`}>{s.value}</p>
                  <p className="text-xs text-surface-600">{s.label}</p>
                </div>
              ))}
            </div>
            {sentiment.total > 0 && (
              <div className="flex gap-1 mt-4 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500" style={{ width: `${(sentiment.positive / sentiment.total) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(sentiment.neutral / sentiment.total) * 100}%` }} />
                <div className="bg-red-500" style={{ width: `${(sentiment.negative / sentiment.total) * 100}%` }} />
              </div>
            )}
          </Card>

          {/* Boost stats */}
          {(boostStats.impressions > 0 || boostStats.clicks > 0) && (
            <Card className="!p-5">
              <h3 className="text-sm font-semibold text-surface-950 mb-4">Boost Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Impressions", value: boostStats.impressions.toLocaleString() },
                  { label: "Clicks", value: boostStats.clicks.toLocaleString() },
                  { label: "CTR", value: `${boostStats.ctr}%` },
                  { label: "Spend", value: `$${boostStats.spend}` },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-lg font-bold text-surface-950">{s.value}</p>
                    <p className="text-xs text-surface-600">{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <Card className="!p-5">
          <h3 className="text-sm font-semibold text-surface-950 mb-4">Recent Reviews</h3>
          <div className="space-y-3">
            {recentReviews.map((r: any, i: number) => (
              <div key={i} className="rounded-lg bg-surface-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-surface-900">{r.title}</span>
                  <div className="flex items-center gap-1 text-amber-400">
                    {"★".repeat(r.rating)}
                    <span className="text-surface-500">{"★".repeat(5 - r.rating)}</span>
                  </div>
                </div>
                <p className="text-xs text-surface-600">{r.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <Card className="!p-5">
          <h3 className="text-sm font-semibold text-surface-950 mb-4">Deal Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-surface-600 border-b border-surface-300">
                  <th className="py-2 pr-4">Deal</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Claimed</th>
                  <th className="py-2 pr-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d: any) => (
                  <tr key={d.id} className="border-b border-surface-200">
                    <td className="py-2.5 pr-4 text-surface-950">{d.title}</td>
                    <td className="py-2.5 pr-4"><Badge variant="outline" size="sm">{d.deal_type}</Badge></td>
                    <td className="py-2.5 pr-4 text-surface-700">{d.current_redemptions}/{d.max_redemptions}</td>
                    <td className="py-2.5 pr-4 font-medium text-surface-950">${d.revenue || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
