import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DealPerformance({ deals }: { deals: any[] }) {
  if (deals.length === 0) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-gray-900">Deal Performance</h3>
        <p className="mt-2 text-sm text-gray-500">No active deals.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-900">Deal Performance</h3>
      <div className="mt-3 space-y-3">
        {deals.map((deal) => {
          const pct = deal.max_redemptions > 0
            ? (deal.current_redemptions / deal.max_redemptions) * 100
            : 0;
          return (
            <div key={deal.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{deal.title}</span>
                <Badge>{deal.deal_type}</Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500">
                  {deal.current_redemptions}/{deal.max_redemptions}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
