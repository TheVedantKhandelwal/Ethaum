"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProduct, getReviews, generateReport, createReview, getComments, createComment } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Globe,
  Sparkles,
  Star,
  PenLine,
  ThumbsUp,
  ThumbsDown,
  Shield,
  Layers,
  TrendingUp,
  Tag,
  ArrowLeft,
  Loader2,
  MessageSquare,
  FileBarChart,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/* ─── Sub-rating labels ─── */
const SUB_RATING_KEYS = [
  { key: "ease_of_use", label: "Ease of Use" },
  { key: "support", label: "Support" },
  { key: "value", label: "Value for Money" },
  { key: "features", label: "Features" },
];

/* ─── Star Rating (inline for full control) ─── */
function StarDisplay({
  rating,
  size = 16,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={`${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "text-surface-400"
          } ${interactive ? "cursor-pointer hover:text-amber-400" : ""}`}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

/* ─── Rating Distribution Bar ─── */
function RatingBar({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-xs text-surface-600">{stars}</span>
      <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />
      <div className="h-2 flex-1 rounded-full bg-surface-300">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-surface-600">{count}</span>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { currentUser } = useUser();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState("reviews");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: "",
    content: "",
    pros: "",
    cons: "",
    sub_ratings: { ease_of_use: 0, support: 0, value: 0, features: 0 } as Record<string, number>,
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = () => {
    setLoading(true);
    getProduct(slug)
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadProduct();
  }, [slug]);

  useEffect(() => {
    if (product?.id) {
      getReviews(product.id).then(setReviews).catch(() => {});
      // Fetch badges
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/products/${slug}/badges`)
        .then(r => r.ok ? r.json() : { badges: [] })
        .then(data => setBadges(data.badges || []))
        .catch(() => {});
    }
  }, [product?.id, slug]);

  // Load comments when discussion tab is active
  useEffect(() => {
    if (activeTab === "discussion" && product) {
      // Use product launches to get comments - find first launch
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/launches?sort=trending`)
        .then(r => r.json())
        .then((launches) => {
          const launch = launches.find((l: any) => l.product_id === product.id || l.product_slug === slug);
          if (launch) {
            getComments(launch.id).then(setComments).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [activeTab, product, slug]);

  /* Rating distribution */
  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
    });
    return dist;
  }, [reviews]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return product?.avg_rating || 0;
    const sum = reviews.reduce((a: number, r: any) => a + r.rating, 0);
    return sum / reviews.length;
  }, [reviews, product?.avg_rating]);

  /* Handlers */
  const handleGenerateReport = async () => {
    if (!product) return;
    setLoadingReport(true);
    try {
      const data = await generateReport(product.id);
      setReport(data);
    } catch {
      // silently fail
    }
    setLoadingReport(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.rating || !reviewForm.title || !product) return;
    setSubmittingReview(true);
    try {
      const validSubRatings: Record<string, number> = {};
      for (const [k, v] of Object.entries(reviewForm.sub_ratings)) {
        if (v > 0) validSubRatings[k] = v;
      }
      await createReview({
        product_id: product.id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        content: reviewForm.content,
        pros: reviewForm.pros
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        cons: reviewForm.cons
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        sub_ratings: Object.keys(validSubRatings).length > 0 ? validSubRatings : undefined,
      });
      setReviewForm({ rating: 0, title: "", content: "", pros: "", cons: "", sub_ratings: { ease_of_use: 0, support: 0, value: 0, features: 0 } });
      setShowReviewForm(false);
      // Reload reviews and product
      getReviews(product.id).then(setReviews).catch(() => {});
      loadProduct();
    } catch {
      // silently fail
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState
          icon="🔍"
          title="Product not found"
          description="The product you are looking for does not exist or has been removed."
          action={
            <Link href="/products">
              <Button variant="outline">
                <ArrowLeft size={14} /> Back to Products
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const credibilityScore = product.credibility_score != null
    ? (product.credibility_score * 100).toFixed(0)
    : null;

  const tabItems = [
    { id: "reviews", label: "Reviews", count: reviews.length },
    { id: "discussion", label: "Discussion" },
    { id: "report", label: "AI Report" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Back link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-surface-600 transition-colors hover:text-surface-950"
      >
        <ArrowLeft size={14} /> All Products
      </Link>

      {/* ── SECTION 1: Hero ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-2xl font-bold text-brand-400">
            {product.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-950 sm:text-3xl">
              {product.name}
            </h1>
            <p className="mt-1 text-surface-600">{product.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {product.category && (
                <Badge variant="brand">{product.category}</Badge>
              )}
              {product.stage && (
                <Badge variant="outline">
                  <TrendingUp size={10} /> {product.stage}
                </Badge>
              )}
              {credibilityScore && (
                <Badge variant="award">
                  <Shield size={10} /> {credibilityScore} Credibility
                </Badge>
              )}
              {badges.map((b: any) => (
                <Badge key={b.id || b.slug} variant="award" size="sm">
                  🏆 {b.name || b.badge_name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {product.website && (
            <a
              href={product.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Globe size={14} /> Visit Website
              </Button>
            </a>
          )}
          <Button
            size="sm"
            onClick={() => {
              setActiveTab("reviews");
              setShowReviewForm(true);
            }}
          >
            <PenLine size={14} /> Write Review
          </Button>
        </div>
      </div>

      {/* ── SECTION 2: At a Glance ── */}
      <Card>
        <CardHeader>
          <CardTitle>At a Glance</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Best For */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-surface-600">
              Best For
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(product.best_for && product.best_for.length > 0
                ? product.best_for
                : ["--"]
              ).map((item: string, i: number) => (
                <Badge key={i} variant="outline" size="sm">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-surface-600">
              Integrations
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(product.integrations && product.integrations.length > 0
                ? product.integrations
                : ["--"]
              ).map((item: string, i: number) => (
                <Badge key={i} variant="outline" size="sm">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-surface-600">
              Stage
            </p>
            <span className="text-sm text-surface-950">
              {product.stage || "--"}
            </span>
          </div>

          {/* ARR */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-surface-600">
              ARR Range
            </p>
            <span className="text-sm text-surface-950">
              {product.arr_range || "--"}
            </span>
          </div>

          {/* Category */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-surface-600">
              Category
            </p>
            <span className="text-sm text-surface-950">
              {product.category || "--"}
            </span>
          </div>
        </div>
      </Card>

      {/* ── SECTION 3: Description ── */}
      {product.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-surface-700">
            {product.description}
          </p>
        </Card>
      )}

      {/* ── SECTION 4: Features ── */}
      {product.features?.list?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Layers size={16} /> Features
              </span>
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {product.features.list.map((f: string) => (
              <div
                key={f}
                className="flex items-center gap-2 rounded-lg border border-surface-300 bg-surface-200/50 px-3 py-2 text-sm text-surface-900"
              >
                <CheckCircle2 size={14} className="shrink-0 text-brand-400" />
                {f}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── SECTION 5: Tabs ── */}
      <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

      {/* ── TAB: Reviews ── */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          {/* Rating Breakdown Widget */}
          <Card>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Big average */}
              <div className="flex flex-col items-center justify-center sm:min-w-[140px]">
                <span className="text-5xl font-bold text-surface-950">
                  {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
                </span>
                {avgRating > 0 && (
                  <>
                    <StarDisplay rating={Math.round(avgRating)} size={18} />
                    <span className="mt-1 text-xs text-surface-600">
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </div>

              {/* Distribution bars */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <RatingBar
                    key={stars}
                    stars={stars}
                    count={ratingDistribution[stars - 1]}
                    total={reviews.length}
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* Review List */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={review.user_name || "Anonymous"}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-surface-950">
                          {review.user_name || "Anonymous"}
                        </span>
                        {review.is_verified && (
                          <Badge variant="success" size="sm">
                            <Shield size={10} /> Verified
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StarDisplay rating={review.rating} size={14} />
                        <span className="text-xs text-surface-600">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {review.title && (
                  <h4 className="mt-3 text-sm font-semibold text-surface-950">
                    {review.title}
                  </h4>
                )}

                {review.content && (
                  <p className="mt-2 text-sm leading-relaxed text-surface-700">
                    {review.content}
                  </p>
                )}

                {/* Pros & Cons */}
                {(review.pros?.length > 0 || review.cons?.length > 0) && (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {review.pros?.length > 0 && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <ThumbsUp size={12} /> Pros
                        </p>
                        <ul className="space-y-1">
                          {review.pros.map((pro: string, i: number) => (
                            <li
                              key={i}
                              className="text-xs text-emerald-300/80"
                            >
                              + {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.cons?.length > 0 && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-400">
                          <ThumbsDown size={12} /> Cons
                        </p>
                        <ul className="space-y-1">
                          {review.cons.map((con: string, i: number) => (
                            <li key={i} className="text-xs text-red-300/80">
                              - {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Meta scores */}
                <div className="mt-3 flex items-center gap-3 border-t border-surface-300 pt-3 text-xs text-surface-600">
                  {review.sentiment_score != null && (
                    <span>
                      Sentiment:{" "}
                      {review.sentiment_score > 0 ? "+" : ""}
                      {review.sentiment_score?.toFixed(2)}
                    </span>
                  )}
                  {review.verification_score != null && (
                    <span>
                      Verification:{" "}
                      {(review.verification_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </Card>
            ))}

            {reviews.length === 0 && !showReviewForm && (
              <EmptyState
                icon="💬"
                title="No reviews yet"
                description="Be the first to share your experience with this product."
                action={
                  <Button onClick={() => setShowReviewForm(true)}>
                    <PenLine size={14} /> Write a Review
                  </Button>
                }
              />
            )}
          </div>

          {/* Write a Review Form */}
          {showReviewForm && (
            <Card>
              <CardHeader>
                <CardTitle>Write a Review</CardTitle>
              </CardHeader>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Rating */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-surface-800">
                    Your Rating
                  </label>
                  <StarDisplay
                    rating={reviewForm.rating}
                    size={28}
                    interactive
                    onChange={(r) =>
                      setReviewForm({ ...reviewForm, rating: r })
                    }
                  />
                </div>

                {/* Sub-ratings */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-surface-800">
                    Rate specific areas
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {SUB_RATING_KEYS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 px-3 py-2">
                        <span className="text-xs text-surface-700">{label}</span>
                        <StarDisplay
                          rating={reviewForm.sub_ratings[key] || 0}
                          size={14}
                          interactive
                          onChange={(r) =>
                            setReviewForm({
                              ...reviewForm,
                              sub_ratings: { ...reviewForm.sub_ratings, [key]: r },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <Input
                  label="Review Title"
                  placeholder="Summarize your experience"
                  value={reviewForm.title}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, title: e.target.value })
                  }
                  required
                />

                {/* Content */}
                <Textarea
                  label="Your Review"
                  placeholder="Tell others about your experience..."
                  rows={4}
                  value={reviewForm.content}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, content: e.target.value })
                  }
                />

                {/* Pros & Cons */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Textarea
                    label="Pros (one per line)"
                    placeholder="What did you like?"
                    rows={3}
                    value={reviewForm.pros}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, pros: e.target.value })
                    }
                  />
                  <Textarea
                    label="Cons (one per line)"
                    placeholder="What could be improved?"
                    rows={3}
                    value={reviewForm.cons}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, cons: e.target.value })
                    }
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={submittingReview || !reviewForm.rating}
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />{" "}
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowReviewForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Show review form toggle when not visible */}
          {!showReviewForm && reviews.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setShowReviewForm(true)}>
                <PenLine size={14} /> Write a Review
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Discussion ── */}
      {activeTab === "discussion" && (
        <div className="space-y-4">
          {/* Comment input */}
          <Card>
            <div className="flex gap-3">
              <Avatar name={currentUser.name} size="md" />
              <div className="flex-1">
                <Textarea
                  placeholder="Ask a question or start a discussion..."
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!commentText.trim() || submittingComment}
                    onClick={async () => {
                      if (!commentText.trim()) return;
                      setSubmittingComment(true);
                      try {
                        // Find the launch for this product
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/launches?sort=trending`);
                        const launches = await res.json();
                        const launch = launches.find((l: any) => l.product_id === product.id || l.product_slug === slug);
                        if (launch) {
                          await createComment(launch.id, { body: commentText });
                          setCommentText("");
                          getComments(launch.id).then(setComments).catch(() => {});
                        }
                      } catch {} finally { setSubmittingComment(false); }
                    }}
                  >
                    {submittingComment ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Comments list */}
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment: any) => (
                <Card key={comment.id} className="!p-4">
                  <div className="flex gap-3">
                    <Avatar name={comment.user_name || "User"} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-950">
                          {comment.user_name || "Anonymous"}
                        </span>
                        {comment.is_maker && (
                          <Badge variant="brand" size="sm">Maker</Badge>
                        )}
                        <span className="text-xs text-surface-600">
                          {comment.created_at ? formatDate(comment.created_at) : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-surface-700">{comment.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-surface-600">
                        <button className="hover:text-surface-900 transition-colors">
                          ▲ {comment.upvote_count || 0}
                        </button>
                        <button className="hover:text-surface-900 transition-colors">
                          Reply
                        </button>
                      </div>
                      {/* Nested replies */}
                      {comment.replies?.map((reply: any) => (
                        <div key={reply.id} className="mt-3 ml-6 rounded-lg border border-surface-300 bg-surface-50 p-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={reply.user_name || "User"} size="sm" />
                            <span className="text-xs font-medium text-surface-950">{reply.user_name || "Anonymous"}</span>
                            {reply.is_maker && <Badge variant="brand" size="sm">Maker</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-surface-700">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="💬"
              title="No discussions yet"
              description="Be the first to start a conversation about this product."
            />
          )}
        </div>
      )}

      {/* ── TAB: AI Report ── */}
      {activeTab === "report" && (
        <div className="space-y-4">
          {!report && (
            <Card className="text-center">
              <div className="py-6">
                <Sparkles
                  size={32}
                  className="mx-auto mb-3 text-brand-400"
                />
                <h3 className="text-lg font-semibold text-surface-950">
                  AI Validation Report
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-surface-600">
                  Generate an AI-powered analysis of {product.name}, including
                  credibility assessment, market positioning, and feature
                  evaluation.
                </p>
                <div className="mt-5">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={loadingReport}
                  >
                    {loadingReport ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />{" "}
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <FileBarChart size={14} /> Generate AI Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {report && (
            <Card className="border-brand-600/30 bg-brand-600/5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/20">
                  <Sparkles size={18} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-surface-950">
                    AI Validation Report
                  </h3>
                  <p className="text-xs text-surface-600">
                    Generated for {product.name}
                  </p>
                </div>
                {report.overall_score != null && (
                  <Badge variant="award" className="ml-auto">
                    Score: {report.overall_score}/10
                  </Badge>
                )}
              </div>

              <div className="space-y-5">
                {report.sections?.map((section: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-surface-300 bg-surface-100 p-4"
                  >
                    <h4 className="mb-2 text-sm font-semibold text-surface-950">
                      {section.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-surface-700">
                      {section.content}
                    </p>
                    {section.score != null && (
                      <div className="mt-2">
                        <Badge variant="outline" size="sm">
                          Section Score: {section.score}/10
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Regenerate */}
              <div className="mt-5 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                >
                  {loadingReport ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />{" "}
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Regenerate Report
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
