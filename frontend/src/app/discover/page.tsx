"use client";

import { useState } from "react";
import Link from "next/link";
import { runMatchmaking } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["DevTools", "Analytics", "Security", "AI/ML", "Sales", "Marketing", "Infrastructure", "Collaboration"];

export default function DiscoverPage() {
  const { currentUser } = useUser();
  const [phase, setPhase] = useState<"input" | "loading" | "results">("input");
  const [matches, setMatches] = useState<any[]>([]);
  const [form, setForm] = useState({
    category: "DevTools",
    features_needed: "",
    budget_tier: "mid",
    stage_preference: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase("loading");
    try {
      const requirements = {
        category: form.category,
        features_needed: form.features_needed.split(",").map((f) => f.trim()).filter(Boolean),
        budget_tier: form.budget_tier,
        stage_preference: form.stage_preference,
      };
      const results = await runMatchmaking({
        buyer_id: currentUser.id,
        requirements,
      });
      setMatches(results);
      setPhase("results");
    } catch {
      setPhase("input");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <Badge variant="brand" className="mb-3">AI-Powered</Badge>
        <h1 className="text-2xl font-bold text-surface-950">Find Your Perfect Tool</h1>
        <p className="text-sm text-surface-600 mt-1">
          Tell us what you need and our AI will match you with the best products
        </p>
      </div>

      {phase === "input" && (
        <Card className="!p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-surface-800 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      form.category === cat
                        ? "bg-brand-600/15 text-brand-400 border border-brand-500/30"
                        : "text-surface-700 hover:bg-surface-200 border border-surface-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Features needed */}
            <Input
              label="Key features needed"
              placeholder="e.g., real-time analytics, Slack integration, API access"
              value={form.features_needed}
              onChange={(e) => setForm({ ...form, features_needed: e.target.value })}
            />

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-surface-800 mb-2">Budget</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "low", label: "Startup", desc: "< $1K/yr" },
                  { id: "mid", label: "Growth", desc: "$1K-10K/yr" },
                  { id: "high", label: "Enterprise", desc: "$10K+/yr" },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setForm({ ...form, budget_tier: b.id })}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      form.budget_tier === b.id
                        ? "border-brand-500 bg-brand-600/10"
                        : "border-surface-400 hover:border-surface-500"
                    }`}
                  >
                    <p className="text-sm font-medium text-surface-950">{b.label}</p>
                    <p className="text-xs text-surface-600">{b.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Stage preference */}
            <Input
              label="Preferred stage (optional)"
              placeholder="e.g., seed, A, B, C"
              value={form.stage_preference}
              onChange={(e) => setForm({ ...form, stage_preference: e.target.value })}
            />

            <Button type="submit" className="w-full" size="lg">
              Find My Match
            </Button>
          </form>
        </Card>
      )}

      {phase === "loading" && (
        <Card className="!p-8 text-center space-y-4">
          <div className="text-4xl animate-pulse-slow">🤖</div>
          <h3 className="text-lg font-semibold text-surface-950">AI is analyzing products...</h3>
          <p className="text-sm text-surface-600">Matching your requirements against our catalog</p>
          <div className="space-y-3 max-w-md mx-auto">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </Card>
      )}

      {phase === "results" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-950">
              {matches.length} matches found
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setPhase("input")}>
              New search
            </Button>
          </div>
          {matches.map((match, idx) => (
            <Card key={match.product_id || idx} hover className="!p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600/10">
                  <span className="text-lg font-bold text-brand-400">
                    {idx === 0 ? "🏆" : `#${idx + 1}`}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-surface-950">
                      {match.product_name || `Product ${idx + 1}`}
                    </h3>
                    {idx === 0 && <Badge variant="award" size="sm">Best Match</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="brand" size="sm">
                      {Math.round((match.match_score || match.score || 0) * 100)}% match
                    </Badge>
                    {match.product_slug && (
                      <Link href={`/products/${match.product_slug}`} className="text-xs text-brand-400 hover:text-brand-300">
                        View product →
                      </Link>
                    )}
                  </div>
                  {match.match_reasons && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(match.match_reasons).map(([key, val]: [string, any]) => (
                        <Badge key={key} variant="outline" size="sm">
                          {typeof val === "string" ? val : key.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
