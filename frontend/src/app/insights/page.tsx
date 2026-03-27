"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getQuadrant, getTrends } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  "DevTools", "Analytics", "Security", "AI/ML",
  "Sales", "Marketing", "Infrastructure", "Collaboration",
];

export default function InsightsPage() {
  const [category, setCategory] = useState("DevTools");
  const [quadrant, setQuadrant] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getQuadrant(category)
      .then((data) => { setQuadrant(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    getTrends().then(setTrends).catch(() => {});
  }, []);

  const products = quadrant?.products || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Market Insights</h1>
        <p className="text-sm text-surface-600 mt-1">AI-powered market intelligence and competitive landscape</p>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              category === cat
                ? "bg-brand-600/15 text-brand-400 border border-brand-500/30"
                : "text-surface-700 hover:bg-surface-200 border border-transparent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quadrant chart */}
        <div className="lg:col-span-2">
          <Card className="!p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-surface-950">Competitive Landscape</h2>
                <p className="text-xs text-surface-600">{category} — Gartner-style quadrant</p>
              </div>
              <Badge variant="brand" size="sm">AI-Generated</Badge>
            </div>

            {loading ? (
              <Skeleton className="h-80 w-full rounded-lg" />
            ) : (
              <div className="relative h-80 border border-surface-300 rounded-lg bg-surface-50 overflow-hidden">
                {/* Quadrant labels */}
                <div className="absolute top-2 left-2 text-[10px] text-surface-600 font-medium">Challengers</div>
                <div className="absolute top-2 right-2 text-[10px] text-brand-400 font-semibold">Leaders</div>
                <div className="absolute bottom-2 left-2 text-[10px] text-surface-600">Niche Players</div>
                <div className="absolute bottom-2 right-2 text-[10px] text-surface-600">Visionaries</div>

                {/* Grid lines */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-surface-300" />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-surface-300" />

                {/* Axis labels */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-surface-500 pb-0.5">
                  Completeness of Vision →
                </div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-surface-500">
                  Ability to Execute →
                </div>

                {/* Product dots */}
                {products.map((p: any) => {
                  const x = ((p.vision_score || p.completeness || 50) / 100) * 90 + 5;
                  const y = 95 - ((p.execution_score || p.ability || p.credibility_score * 100 || 50) / 100) * 90;
                  return (
                    <Link
                      key={p.id || p.slug}
                      href={`/products/${p.slug}`}
                      className="absolute group"
                      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <div className="h-3 w-3 rounded-full bg-brand-500 border-2 border-brand-300 group-hover:scale-150 transition-transform" />
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap rounded bg-surface-200 px-1.5 py-0.5 text-[9px] text-surface-900 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        {p.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: rankings + trends */}
        <div className="space-y-6">
          {/* Top in category */}
          <Card className="!p-5">
            <h3 className="text-sm font-semibold text-surface-950 mb-3">Top in {category}</h3>
            <div className="space-y-2">
              {products.slice(0, 5).map((p: any, i: number) => (
                <Link key={p.id || i} href={`/products/${p.slug}`} className="flex items-center gap-2 rounded-lg p-2 hover:bg-surface-200 transition-colors">
                  <span className="text-xs font-bold text-surface-600 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-950 truncate">{p.name}</p>
                    <p className="text-[10px] text-surface-600">{typeof p.credibility_score === 'number' ? (p.credibility_score * 100).toFixed(0) : '?'}% credibility</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Trending categories */}
          {trends?.trending_categories && (
            <Card className="!p-5">
              <h3 className="text-sm font-semibold text-surface-950 mb-3">Hot Categories</h3>
              <div className="space-y-1.5">
                {trends.trending_categories.slice(0, 6).map((cat: any) => (
                  <button
                    key={cat.category}
                    onClick={() => setCategory(cat.category)}
                    className="flex items-center justify-between w-full rounded-lg p-2 hover:bg-surface-200 transition-colors text-left"
                  >
                    <span className="text-xs text-surface-900">{cat.category}</span>
                    <Badge variant="outline" size="sm">{cat.count} products</Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
