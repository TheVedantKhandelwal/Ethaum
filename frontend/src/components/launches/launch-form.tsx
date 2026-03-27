"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLaunch, getProducts } from "@/lib/api";
import { Sparkles } from "lucide-react";

export function LaunchForm() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    title: "",
    tagline: "",
    description: "",
  });

  const loadProducts = async () => {
    if (loaded) return;
    try {
      const data = await getProducts();
      setProducts(data);
      setLoaded(true);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.title) return;
    setSubmitting(true);
    try {
      await createLaunch(form);
      router.push("/launches");
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Product</label>
        <select
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={form.product_id}
          onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          onFocus={loadProducts}
          required
        >
          <option value="">Select a product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Launch Title</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Introducing our next-gen feature..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Tagline <span className="text-gray-400">(optional — AI will also generate one)</span>
        </label>
        <input
          type="text"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Your tagline here"
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description <span className="text-gray-400">(optional — AI will also generate one)</span>
        </label>
        <textarea
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
        <Sparkles size={16} />
        <span>AI will automatically generate an enhanced tagline and description for your launch.</span>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "Creating Launch..." : "Submit Launch"}
      </button>
    </form>
  );
}
