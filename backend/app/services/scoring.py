import math
from datetime import datetime, timedelta, timezone


def compute_trending_score(upvote_count: int, created_at: datetime, time_window_hours: int = 48) -> float:
    """Compute trending score using a time-decay algorithm (similar to HN/Reddit).

    Higher recent upvotes = higher score, decays over time.
    """
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_hours = max((now - created_at).total_seconds() / 3600, 0.1)
    gravity = 1.8
    score = upvote_count / math.pow(age_hours + 2, gravity)
    return round(score * 1000, 2)  # Scale up for readability


def compute_credibility_score(
    avg_rating: float,
    review_count: int,
    verification_avg: float,
    engagement: float,
    consistency: float,
) -> float:
    """Weighted credibility score.

    Formula: 0.3*avg_rating_norm + 0.25*review_count_norm + 0.2*verification_avg + 0.15*engagement + 0.1*consistency
    """
    # Normalize avg_rating to 0-1 (from 0-5)
    rating_norm = avg_rating / 5.0

    # Normalize review count (logarithmic, cap at ~50 reviews for max)
    review_norm = min(math.log(review_count + 1) / math.log(51), 1.0)

    score = (
        0.30 * rating_norm
        + 0.25 * review_norm
        + 0.20 * verification_avg
        + 0.15 * engagement
        + 0.10 * consistency
    )
    return round(min(max(score, 0.0), 1.0), 3)
