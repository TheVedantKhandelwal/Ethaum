import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface MatchCardProps {
  match: any;
  rank: number;
}

export function MatchCard({ match, rank }: MatchCardProps) {
  const pct = Math.round(match.match_score * 100);
  const reasons = match.match_reasons || {};

  return (
    <Card className={rank === 1 ? "border-brand-300 ring-1 ring-brand-200" : ""}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-lg font-bold text-brand-700">
          {match.product_name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/products/${match.product_slug}`} className="text-base font-semibold text-gray-900 hover:text-brand-600">
              {match.product_name}
            </Link>
            {rank === 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                <Trophy className="h-3 w-3" /> Best Match
              </span>
            )}
          </div>

          {/* Score bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${pct >= 60 ? "bg-green-500" : pct >= 30 ? "bg-yellow-400" : "bg-gray-300"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">{pct}%</span>
          </div>

          {/* Reasons */}
          {Object.keys(reasons).length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {Object.values(reasons).map((reason: any, i: number) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="h-1 w-1 rounded-full bg-brand-400" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href={`/products/${match.product_slug}`}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-500 hover:text-brand-600"
        >
          View
        </Link>
      </div>
    </Card>
  );
}
