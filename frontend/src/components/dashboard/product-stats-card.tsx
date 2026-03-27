import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";

function CredibilityRing({ score }: { score: number }) {
  const pct = score * 100;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke="#4c6ef5" strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function ProductStatsCard({ product }: { product: any }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <CredibilityRing score={product.credibility_score || 0} />
        <div className="flex-1">
          <Link href={`/products/${product.slug}`} className="text-base font-semibold text-gray-900 hover:text-brand-600">
            {product.name}
          </Link>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {product.avg_rating && (
              <span className="flex items-center gap-1">
                <StarRating rating={Math.round(product.avg_rating)} size={12} />
                {product.avg_rating}
              </span>
            )}
            <span>{product.review_count} reviews</span>
            <span>{product.upvotes} upvotes</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
