"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toggleUpvote } from "@/lib/api";

// Using a fixed demo user ID for the MVP (no auth)
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

interface LaunchCardProps {
  launch: any;
}

export function LaunchCard({ launch }: LaunchCardProps) {
  const [votes, setVotes] = useState(launch.upvote_count);
  const [voted, setVoted] = useState(false);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const result = await toggleUpvote(launch.id, DEMO_USER_ID);
      setVotes(result.upvote_count);
      setVoted(result.action === "added");
    } catch {
      // silently fail
    }
  };

  return (
    <Card className="flex items-start gap-4 transition-shadow hover:shadow-md">
      <button
        onClick={handleUpvote}
        className={`flex flex-col items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          voted
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50"
        }`}
      >
        <ChevronUp size={18} />
        <span>{votes}</span>
      </button>

      <div className="flex-1">
        <Link
          href={`/products/${launch.product_slug}`}
          className="text-lg font-semibold text-gray-900 hover:text-brand-700"
        >
          {launch.title}
        </Link>
        <p className="mt-1 text-sm text-gray-600">
          {launch.ai_tagline || launch.tagline || ""}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {launch.product_name && (
            <Badge>{launch.product_name}</Badge>
          )}
          {launch.ai_tagline && (
            <span className="flex items-center gap-1 text-xs text-brand-600">
              <Sparkles size={12} /> AI-enhanced
            </span>
          )}
        </div>
      </div>

      {launch.product_logo && (
        <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 sm:flex">
          <span className="text-lg">
            {launch.product_name?.[0] || "?"}
          </span>
        </div>
      )}
    </Card>
  );
}
