"use client";

import { useState } from "react";
import { TagInput } from "@/components/ui/tag-input";
import { Search } from "lucide-react";

const CATEGORIES = ["DevTools", "Analytics", "Security", "AI/ML", "Infrastructure", "Sales", "Collaboration"];
const BUDGET_TIERS = [
  { value: "low", label: "Low — Early stage / bootstrapped" },
  { value: "mid", label: "Mid — Series A-B pricing" },
  { value: "high", label: "High — Enterprise / Series C+" },
];
const STAGES = [
  { value: "", label: "No preference" },
  { value: "seed", label: "Seed" },
  { value: "A", label: "Series A" },
  { value: "B", label: "Series B" },
  { value: "C", label: "Series C+" },
];

interface RequirementsFormProps {
  onSubmit: (requirements: any) => void;
  loading: boolean;
}

export function RequirementsForm({ onSubmit, loading }: RequirementsFormProps) {
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [stage, setStage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      category: category || undefined,
      features_needed: features.length > 0 ? features : undefined,
      budget_tier: budget || undefined,
      stage_preference: stage || undefined,
    });
  };

  const labelClass = "block text-sm font-medium text-gray-700";
  const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">Any category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Features Needed</label>
        <TagInput tags={features} onChange={setFeatures} placeholder="e.g. Auto-scaling, CI/CD integration..." />
      </div>
      <div>
        <label className={labelClass}>Budget Tier</label>
        <select value={budget} onChange={(e) => setBudget(e.target.value)} className={inputClass}>
          <option value="">Any budget</option>
          {BUDGET_TIERS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Stage Preference</label>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
        {loading ? "Finding matches..." : "Find Matches"}
      </button>
    </form>
  );
}
