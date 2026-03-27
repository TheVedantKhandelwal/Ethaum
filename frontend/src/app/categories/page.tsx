"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const categoryIcons: Record<string, string> = {
  Software: "💻", DevTools: "🛠️", Analytics: "📊", Security: "🔒",
  "AI/ML": "🤖", Sales: "💰", Marketing: "📣", Infrastructure: "☁️",
  Collaboration: "🤝", Finance: "💵",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`)
      .then((r) => r.json())
      .then((data) => { setCategories(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rootCategories = categories[0]?.children || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Categories</h1>
        <p className="text-sm text-surface-600 mt-1">Browse software by category</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rootCategories.map((cat: any) => (
            <Link key={cat.id} href={`/categories/${cat.slug}`}>
              <Card hover className="h-full space-y-3 !p-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryIcons[cat.name] || "📂"}</span>
                  <div>
                    <h3 className="text-base font-semibold text-surface-950">{cat.name}</h3>
                    <p className="text-xs text-surface-600">{cat.product_count} products</p>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-sm text-surface-700 line-clamp-2">{cat.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(cat.children || []).slice(0, 4).map((child: any) => (
                    <Badge key={child.id} variant="outline" size="sm">
                      {child.name}
                    </Badge>
                  ))}
                  {(cat.children || []).length > 4 && (
                    <Badge variant="outline" size="sm">+{cat.children.length - 4}</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
