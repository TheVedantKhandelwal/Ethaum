import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { Shield, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ReviewCardProps {
  review: any;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} size={14} />
            <span className="text-sm font-medium text-gray-900">{review.title}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {review.user_name || "Anonymous"} &middot; {formatDate(review.created_at)}
          </p>
        </div>
        {review.is_verified && (
          <Badge variant="success">
            <Shield size={12} className="mr-1" />
            Verified
          </Badge>
        )}
      </div>

      {review.content && (
        <p className="mt-3 text-sm text-gray-700">{review.content}</p>
      )}

      <div className="mt-3 flex gap-4">
        {review.pros?.length > 0 && (
          <div className="flex-1">
            <p className="flex items-center gap-1 text-xs font-medium text-green-700">
              <ThumbsUp size={12} /> Pros
            </p>
            <ul className="mt-1 space-y-1">
              {review.pros.map((pro: string, i: number) => (
                <li key={i} className="text-xs text-gray-600">+ {pro}</li>
              ))}
            </ul>
          </div>
        )}
        {review.cons?.length > 0 && (
          <div className="flex-1">
            <p className="flex items-center gap-1 text-xs font-medium text-red-700">
              <ThumbsDown size={12} /> Cons
            </p>
            <ul className="mt-1 space-y-1">
              {review.cons.map((con: string, i: number) => (
                <li key={i} className="text-xs text-gray-600">- {con}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span>Sentiment: {(review.sentiment_score > 0 ? "+" : "")}{review.sentiment_score?.toFixed(2)}</span>
        <span>Verification: {(review.verification_score * 100).toFixed(0)}%</span>
      </div>
    </Card>
  );
}
