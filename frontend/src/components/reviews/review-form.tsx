"use client";

import { useState } from "react";
import { createReview } from "@/lib/api";
import { StarRating } from "@/components/ui/star-rating";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    rating: 0,
    title: "",
    content: "",
    pros: "",
    cons: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rating || !form.title) return;
    setSubmitting(true);
    try {
      await createReview({
        product_id: productId,
        user_id: DEMO_USER_ID,
        rating: form.rating,
        title: form.title,
        content: form.content,
        pros: form.pros.split("\n").filter(Boolean),
        cons: form.cons.split("\n").filter(Boolean),
      });
      setForm({ rating: 0, title: "", content: "", pros: "", cons: "" });
      onSuccess?.();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Rating</label>
        <div className="mt-1">
          <StarRating
            rating={form.rating}
            interactive
            size={24}
            onChange={(r) => setForm({ ...form, rating: r })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Review</label>
        <textarea
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={3}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Pros (one per line)</label>
          <textarea
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            rows={2}
            value={form.pros}
            onChange={(e) => setForm({ ...form, pros: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cons (one per line)</label>
          <textarea
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            rows={2}
            value={form.cons}
            onChange={(e) => setForm({ ...form, cons: e.target.value })}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !form.rating}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
