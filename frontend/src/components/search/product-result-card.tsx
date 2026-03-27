import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ProductResultCard({ product }: { product: any }) {
  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-lg font-bold text-brand-700">
            {product.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{product.tagline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {product.category && <Badge>{product.category}</Badge>}
              {product.stage && <Badge variant="success">Series {product.stage}</Badge>}
              {(product.features?.list || []).slice(0, 3).map((f: string) => (
                <Badge key={f} className="text-xs">{f}</Badge>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(product.credibility_score || 0) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">
                {((product.credibility_score || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
