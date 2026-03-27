import { Card } from "@/components/ui/card";
import { Sparkles, Trophy } from "lucide-react";

interface AiSummaryProps {
  summary: {
    verdict: string;
    per_product: { name: string; best_for: string; reasoning: string }[];
    winner: string;
  };
}

export function AiSummary({ summary }: AiSummaryProps) {
  return (
    <Card className="border-brand-200 bg-gradient-to-r from-brand-50 to-white">
      <div className="flex items-center gap-2 text-brand-700">
        <Sparkles className="h-5 w-5" />
        <h3 className="text-base font-semibold">AI Verdict</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{summary.verdict}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.per_product.map((item) => {
          const isWinner = item.name === summary.winner;
          return (
            <div
              key={item.name}
              className={`rounded-lg border p-3 ${
                isWinner ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                {isWinner && <Trophy className="h-3.5 w-3.5 text-green-600" />}
              </div>
              <p className="mt-1 text-xs font-medium text-brand-600">Best for: {item.best_for}</p>
              <p className="mt-1 text-xs text-gray-500">{item.reasoning}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
