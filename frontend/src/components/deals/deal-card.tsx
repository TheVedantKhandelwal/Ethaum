import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Clock } from "lucide-react";

interface DealCardProps {
  deal: any;
}

export function DealCard({ deal }: DealCardProps) {
  const discount = Math.round(
    ((deal.original_price - deal.deal_price) / deal.original_price) * 100
  );
  const remaining = deal.max_redemptions - deal.current_redemptions;

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/products/${deal.product_slug}`}
              className="text-lg font-semibold text-gray-900 hover:text-brand-700"
            >
              {deal.title}
            </Link>
            {deal.product_name && (
              <p className="text-sm text-gray-500">{deal.product_name}</p>
            )}
          </div>
          <Badge variant={deal.deal_type === "lifetime" ? "success" : "default"}>
            {deal.deal_type}
          </Badge>
        </div>
        {deal.description && (
          <p className="mt-2 text-sm text-gray-600">{deal.description}</p>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900">
            ${deal.deal_price}
          </span>
          <span className="text-sm text-gray-400 line-through">
            ${deal.original_price}
          </span>
          <Badge variant="success">-{discount}%</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Tag size={12} /> {remaining} left
          </span>
          {deal.expires_at && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> Expires {new Date(deal.expires_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
