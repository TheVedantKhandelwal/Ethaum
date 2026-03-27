"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDeal, getProducts } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

const DEAL_TYPES = [
  { id: "lifetime", label: "Lifetime", desc: "One-time payment, lifetime access" },
  { id: "discount", label: "Discount", desc: "Percentage off subscription" },
  { id: "pilot", label: "Free Pilot", desc: "Trial period with full access" },
];

export default function NewDealPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    product_id: "",
    title: "",
    description: "",
    deal_type: "discount",
    original_price: "",
    deal_price: "",
    max_redemptions: "100",
    expires_at: "",
  });

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createDeal({
        product_id: form.product_id,
        title: form.title,
        description: form.description,
        deal_type: form.deal_type,
        original_price: parseFloat(form.original_price) || 0,
        deal_price: parseFloat(form.deal_price) || 0,
        max_redemptions: parseInt(form.max_redemptions) || 100,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      });
      router.push("/deals");
    } catch (e: any) {
      setError(e.message || "Failed to create deal");
    } finally {
      setLoading(false);
    }
  };

  const discount = form.original_price && form.deal_price
    ? Math.round((1 - parseFloat(form.deal_price) / parseFloat(form.original_price)) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Create a Deal</h1>
        <p className="text-sm text-surface-600 mt-1">Offer exclusive pricing to attract buyers</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product selector */}
        <Card className="!p-5">
          <label className="mb-2 block text-sm font-medium text-surface-800">Select Product</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => update("product_id", p.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  form.product_id === p.id
                    ? "border-brand-500 bg-brand-600/10"
                    : "border-surface-400 hover:border-surface-500"
                }`}
              >
                <p className="text-sm font-medium text-surface-950 truncate">{p.name}</p>
                <p className="text-xs text-surface-600">{p.category}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Deal type */}
        <Card className="!p-5">
          <label className="mb-2 block text-sm font-medium text-surface-800">Deal Type</label>
          <div className="grid grid-cols-3 gap-2">
            {DEAL_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update("deal_type", t.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  form.deal_type === t.id
                    ? "border-brand-500 bg-brand-600/10"
                    : "border-surface-400 hover:border-surface-500"
                }`}
              >
                <p className="text-sm font-medium text-surface-950">{t.label}</p>
                <p className="text-[10px] text-surface-600">{t.desc}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Details */}
        <Card className="!p-5 space-y-4">
          <Input label="Deal Title" placeholder="50% off annual plan" value={form.title} onChange={(e) => update("title", e.target.value)} required />
          <Textarea label="Description" placeholder="What's included in this deal?" value={form.description} onChange={(e) => update("description", e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Original Price ($)" type="number" placeholder="99" value={form.original_price} onChange={(e) => update("original_price", e.target.value)} />
            <Input label="Deal Price ($)" type="number" placeholder="49" value={form.deal_price} onChange={(e) => update("deal_price", e.target.value)} />
          </div>

          {discount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">{discount}% discount</Badge>
              <span className="text-xs text-surface-600">
                Buyers save ${(parseFloat(form.original_price) - parseFloat(form.deal_price)).toFixed(2)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Redemptions" type="number" value={form.max_redemptions} onChange={(e) => update("max_redemptions", e.target.value)} />
            <Input label="Expires At" type="date" value={form.expires_at} onChange={(e) => update("expires_at", e.target.value)} />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={!form.product_id || !form.title || loading}>
            {loading ? "Creating..." : "Create Deal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
