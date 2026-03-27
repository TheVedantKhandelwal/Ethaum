import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone, timedelta

from app.services.scoring import compute_trending_score, compute_credibility_score


def make_launch(upvote_count, hours_ago):
    launch = MagicMock()
    launch.upvote_count = upvote_count
    launch.created_at = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return launch


def make_product_and_reviews(avg_rating, review_count, verified_ratio=0.5):
    product = MagicMock()
    product.credibility_score = 0.0

    reviews = []
    for i in range(review_count):
        review = MagicMock()
        review.rating = avg_rating
        review.verification_score = 0.7 if i < int(review_count * verified_ratio) else 0.3
        review.sentiment_score = 0.5
        reviews.append(review)

    return product, reviews


def test_trending_score_decays_with_time():
    new_launch = make_launch(100, hours_ago=1)
    old_launch = make_launch(100, hours_ago=24)

    new_score = compute_trending_score(new_launch)
    old_score = compute_trending_score(old_launch)

    assert new_score > old_score


def test_trending_score_increases_with_upvotes():
    few = make_launch(10, hours_ago=2)
    many = make_launch(100, hours_ago=2)

    assert compute_trending_score(many) > compute_trending_score(few)


def test_credibility_score_range():
    product, reviews = make_product_and_reviews(avg_rating=4.5, review_count=20)
    score = compute_credibility_score(product, reviews)
    assert 0 <= score <= 1


def test_credibility_higher_for_better_products():
    good_product, good_reviews = make_product_and_reviews(4.5, 50, 0.8)
    bad_product, bad_reviews = make_product_and_reviews(2.0, 5, 0.1)

    good_score = compute_credibility_score(good_product, good_reviews)
    bad_score = compute_credibility_score(bad_product, bad_reviews)

    assert good_score > bad_score


def test_credibility_zero_reviews():
    product, reviews = make_product_and_reviews(0, 0)
    score = compute_credibility_score(product, reviews)
    assert score >= 0
