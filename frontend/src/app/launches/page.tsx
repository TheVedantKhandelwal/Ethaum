"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLaunches, getLeaderboard } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { SkeletonProductCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toggleUpvote } from "@/lib/api";

const rankBadges = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export default function LaunchesPage() {
  const { currentUser } = useUser();
  const [launches, setLaunches] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sort, setSort] = useState("trending");
  const [activeTab, setActiveTab] = useState("feed");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    setLoading(true);
    getLaunches(sort)
      .then((data) => { setLaunches(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sort]);

  useEffect(() => {
    if (activeTab === "leaderboard") {
      getLeaderboard(period).then(setLeaderboard).catch(() => {});
    }
  }, [activeTab, period]);

  const handleUpvote = async (launchId: string) => {
    try {
      const result = await toggleUpvote(launchId, currentUser.id);
      setLaunches((prev) =>
        prev.map((l) =>
          l.id === launchId ? { ...l, upvote_count: result.upvote_count } : l
        )
      );
    } catch {}
  };

  // Group launches by date
  const groupedLaunches: Record<string, any[]> = {};
  launches.forEach((l) => {
    const date = l.launch_date || new Date(l.created_at).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const label = date === today ? "Today" : date === yesterday ? "Yesterday" : date;
    if (!groupedLaunches[label]) groupedLaunches[label] = [];
    groupedLaunches[label].push(l);
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">Launches</h1>
          <p className="text-sm text-surface-600 mt-1">Discover the latest SaaS product launches</p>
        </div>
        <Link href="/launches/new">
          <Button>Submit Launch</Button>
        </Link>
      </div>

      {/* Tabs: Feed | Leaderboard */}
      <Tabs
        tabs={[
          { id: "feed", label: "Launch Feed" },
          { id: "leaderboard", label: "Leaderboard" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "feed" && (
        <>
          {/* Sort pills */}
          <div className="flex gap-2">
            {["trending", "recent", "top"].map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  sort === s
                    ? "bg-brand-600/15 text-brand-400"
                    : "text-surface-700 hover:bg-surface-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Date-grouped feed */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonProductCard key={i} />)}
            </div>
          ) : Object.keys(groupedLaunches).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedLaunches).map(([date, items]) => (
                <div key={date}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">
                    {date}
                  </h3>
                  <div className="space-y-2">
                    {items.map((launch, idx) => (
                      <Card key={launch.id} hover className="flex items-center gap-4 !p-4">
                        {/* Rank */}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-sm">
                          {idx < 5 ? rankBadges[idx] : (
                            <span className="text-surface-600 font-medium">{idx + 1}</span>
                          )}
                        </span>

                        {/* Product icon */}
                        <Link href={`/products/${launch.product_slug || ""}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-base font-bold text-brand-400">
                          {(launch.product_name || launch.title)?.[0] || "?"}
                        </Link>

                        {/* Info */}
                        <Link href={`/products/${launch.product_slug || ""}`} className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-surface-950 truncate">
                            {launch.product_name || launch.title}
                          </h3>
                          <p className="text-xs text-surface-600 truncate">
                            {launch.tagline || launch.ai_tagline || ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {launch.category && <Badge variant="outline" size="sm">{launch.category}</Badge>}
                            {idx === 0 && <Badge variant="award" size="sm">Product of the Day</Badge>}
                          </div>
                        </Link>

                        {/* Upvote button */}
                        <button
                          onClick={() => handleUpvote(launch.id)}
                          className="flex flex-col items-center gap-0.5 rounded-lg border border-surface-400 px-4 py-2 text-surface-800 hover:bg-surface-200 hover:border-brand-500 hover:text-brand-400 transition-all"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          <span className="text-xs font-semibold">{launch.upvote_count || 0}</span>
                        </button>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🚀" title="No launches yet" description="Be the first to submit a product launch!" action={
              <Link href="/launches/new"><Button>Submit Launch</Button></Link>
            } />
          )}
        </>
      )}

      {activeTab === "leaderboard" && (
        <>
          {/* Period pills */}
          <div className="flex gap-2">
            {["daily", "weekly", "monthly"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  period === p
                    ? "bg-brand-600/15 text-brand-400"
                    : "text-surface-700 hover:bg-surface-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {leaderboard.map((item, idx) => (
              <Card key={item.id} className="flex items-center gap-4 !p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
                  {idx < 3 ? rankBadges[idx] : <span className="text-sm text-surface-600 font-semibold">{idx + 1}</span>}
                </span>
                <Link href={`/products/${item.product_slug || ""}`} className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-surface-950">{item.product_name || item.title}</h3>
                  <p className="text-xs text-surface-600">{item.tagline}</p>
                </Link>
                <div className="text-right">
                  <p className="text-sm font-bold text-surface-950">{item.upvote_count}</p>
                  <p className="text-[10px] text-surface-600">upvotes</p>
                </div>
              </Card>
            ))}
            {leaderboard.length === 0 && (
              <EmptyState icon="🏆" title="No leaderboard data" description="Launches will appear here once they get upvotes." />
            )}
          </div>
        </>
      )}
    </div>
  );
}
