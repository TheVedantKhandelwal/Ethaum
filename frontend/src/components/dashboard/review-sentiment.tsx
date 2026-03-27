import { Card } from "@/components/ui/card";

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-medium text-gray-600">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-gray-500">{count}</span>
    </div>
  );
}

export function ReviewSentiment({ sentiment, reviews }: { sentiment: any; reviews: any[] }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-900">Review Sentiment</h3>
      <div className="mt-3 space-y-2">
        <Bar label="Positive" count={sentiment.positive} total={sentiment.total} color="bg-green-500" />
        <Bar label="Neutral" count={sentiment.neutral} total={sentiment.total} color="bg-yellow-400" />
        <Bar label="Negative" count={sentiment.negative} total={sentiment.total} color="bg-red-400" />
      </div>

      {reviews.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500">Recent</p>
          {reviews.map((r: any, i: number) => (
            <div key={i} className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">{r.title}</span>
                <span className="text-xs text-gray-400">{"★".repeat(r.rating)}</span>
              </div>
              {r.content && <p className="mt-0.5 text-xs text-gray-500">{r.content}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
