"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProducts, compareProducts, getComparisonSummary } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProducts("limit=50").then(setProducts).catch(() => {});
    const ids = searchParams.get("products")?.split(",").filter(Boolean);
    if (ids && ids.length >= 2) {
      setSelected(ids);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selected.length >= 2) {
      setLoading(true);
      Promise.all([
        compareProducts(selected).catch(() => null),
        getComparisonSummary(selected).catch(() => null),
      ]).then(([comp, sum]) => {
        setComparison(comp);
        setSummary(sum);
        setLoading(false);
      });
    }
  }, [selected]);

  const toggleProduct = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < 4
        ? [...prev, id]
        : prev
    );
  };

  const selectedProducts = products.filter((p) => selected.includes(p.id));
  const compProducts = comparison?.products || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Compare Products</h1>
        <p className="text-sm text-surface-600 mt-1">Select 2-4 products to compare side by side</p>
      </div>

      {/* Product selector */}
      <Card className="!p-5">
        <h3 className="text-sm font-semibold text-surface-950 mb-3">
          Select products ({selected.length}/4)
        </h3>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleProduct(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selected.includes(p.id)
                  ? "bg-brand-600/15 text-brand-400 border border-brand-500/30"
                  : "text-surface-700 hover:bg-surface-200 border border-surface-400"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      {/* AI Summary */}
      {summary && (
        <Card className="!p-5 !border-brand-500/20 !bg-brand-950/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="text-sm font-semibold text-brand-400">AI Verdict</h3>
          </div>
          <p className="text-sm text-surface-800 mb-3">{summary.verdict}</p>
          {summary.winner && (
            <Badge variant="award" size="sm">Winner: {summary.winner}</Badge>
          )}
        </Card>
      )}

      {/* Comparison table */}
      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : selected.length >= 2 && compProducts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 pr-4 text-xs text-surface-600 font-medium w-32">Metric</th>
                {compProducts.map((p: any) => (
                  <th key={p.name} className="text-center py-3 px-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-sm font-bold text-brand-400">
                        {p.name?.[0]}
                      </div>
                      <span className="text-xs font-semibold text-surface-950">{p.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Category", key: "category" },
                { label: "Stage", key: "stage" },
                { label: "Rating", key: "avg_rating", format: (v: any) => v ? `${Number(v).toFixed(1)}/5` : "N/A" },
                { label: "Reviews", key: "review_count" },
                { label: "Credibility", key: "credibility_score", format: (v: any) => v ? `${(Number(v) * 100).toFixed(0)}%` : "N/A" },
              ].map((row) => (
                <tr key={row.label} className="border-t border-surface-300">
                  <td className="py-3 pr-4 text-xs text-surface-600 font-medium">{row.label}</td>
                  {compProducts.map((p: any) => {
                    const val = p[row.key];
                    return (
                      <td key={p.name} className="text-center py-3 px-4 text-xs text-surface-900">
                        {row.format ? row.format(val) : (val || "—")}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Feature comparison */}
              <tr className="border-t border-surface-300">
                <td className="py-3 pr-4 text-xs text-surface-600 font-medium">Features</td>
                {compProducts.map((p: any) => (
                  <td key={p.name} className="py-3 px-4">
                    <div className="flex flex-wrap justify-center gap-1">
                      {(p.features?.list || []).slice(0, 4).map((f: string) => (
                        <Badge key={f} variant="outline" size="sm">{f}</Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : selected.length < 2 ? (
        <EmptyState
          icon="⚖️"
          title="Select at least 2 products"
          description="Choose products above to see a detailed comparison."
        />
      ) : null}

      {/* Per-product analysis */}
      {summary?.per_product && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.per_product.map((p: any) => (
            <Card key={p.name} className="!p-5">
              <h4 className="text-sm font-semibold text-surface-950 mb-1">{p.name}</h4>
              <Badge variant="outline" size="sm" className="mb-2">{p.best_for}</Badge>
              <p className="text-xs text-surface-700">{p.reasoning}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
