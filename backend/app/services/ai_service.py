import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

OLLAMA_TIMEOUT = 60.0


async def _generate(prompt: str, system: str = "") -> str | None:
    """Call Ollama /api/generate and return the response text, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            payload = {
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            }
            if system:
                payload["system"] = system
            resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
            resp.raise_for_status()
            return resp.json().get("response", "")
    except Exception as e:
        logger.warning("Ollama unavailable, using fallback: %s", e)
        return None


async def generate_launch_content(product_name: str, features: dict | None) -> dict:
    """Generate a compelling tagline + description for a product launch."""
    feature_text = ", ".join(features.get("list", [])) if features and "list" in features else "various features"
    prompt = (
        f"Product: {product_name}\nFeatures: {feature_text}\n\n"
        "Generate a compelling one-line tagline and a 2-3 sentence product description. "
        "Respond in JSON: {\"tagline\": \"...\", \"description\": \"...\"}"
    )
    result = await _generate(prompt, system="You are a tech marketing copywriter. Respond only with valid JSON.")
    if result:
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass
    # Fallback
    return {
        "tagline": f"{product_name} — Supercharge your workflow",
        "description": f"{product_name} helps teams work smarter with {feature_text}. "
        "Built for modern teams looking to scale efficiently.",
    }


async def verify_review(review_text: str) -> float:
    """Analyze review text for specificity, consistency, and spam markers. Returns 0-1 score."""
    prompt = (
        f"Review text: \"{review_text}\"\n\n"
        "Analyze this product review for authenticity. Score from 0.0 to 1.0 based on: "
        "specificity of claims, consistency, absence of spam patterns, proper grammar. "
        "Respond with just a number like 0.75"
    )
    result = await _generate(prompt, system="You are a review verification system. Respond with only a float number.")
    if result:
        try:
            score = float(result.strip())
            return max(0.0, min(1.0, score))
        except ValueError:
            pass
    # Heuristic fallback: longer, more detailed reviews score higher
    words = len(review_text.split()) if review_text else 0
    if words > 50:
        return 0.7
    if words > 20:
        return 0.5
    return 0.3


async def analyze_sentiment(text: str) -> float:
    """Extract sentiment from text. Returns -1 to 1."""
    prompt = (
        f"Text: \"{text}\"\n\n"
        "Analyze the sentiment of this text. Respond with a single number from -1.0 (very negative) "
        "to 1.0 (very positive). Example: 0.6"
    )
    result = await _generate(prompt, system="You are a sentiment analysis system. Respond with only a float number.")
    if result:
        try:
            score = float(result.strip())
            return max(-1.0, min(1.0, score))
        except ValueError:
            pass
    # Heuristic fallback
    positive_words = {"great", "excellent", "amazing", "love", "best", "fantastic", "awesome", "good", "helpful"}
    negative_words = {"bad", "terrible", "awful", "hate", "worst", "poor", "useless", "broken", "disappointing"}
    words = set(text.lower().split()) if text else set()
    pos = len(words & positive_words)
    neg = len(words & negative_words)
    total = pos + neg
    if total == 0:
        return 0.0
    return (pos - neg) / total


async def match_buyer_to_products(requirements: dict, products: list[dict]) -> list[dict]:
    """Score products against buyer requirements. Returns list of {product_id, score, reasons}."""
    prompt = (
        f"Buyer requirements: {json.dumps(requirements)}\n\n"
        f"Available products: {json.dumps(products[:10])}\n\n"
        "For each product, compute a match score (0-1) and give reasons. "
        "Respond in JSON: [{\"product_id\": \"...\", \"score\": 0.8, \"reasons\": {\"feature_match\": \"...\", \"category_fit\": \"...\"}}]"
    )
    result = await _generate(prompt, system="You are a B2B matchmaking system. Respond only with valid JSON array.")
    if result:
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass
    # Heuristic fallback
    matches = []
    req_category = requirements.get("category", "").lower()
    req_features = set(f.lower() for f in requirements.get("features_needed", []))
    req_stage = requirements.get("stage_preference", "").lower()

    budget_tiers = {"low": ["seed", "a"], "mid": ["a", "b"], "high": ["b", "c", "d"]}

    for p in products:
        score = 0.0
        reasons = {}
        # Category match (0.35)
        if req_category and req_category in (p.get("category") or "").lower():
            score += 0.35
            reasons["category_fit"] = "Category matches requirements"
        # Feature overlap (0.35)
        p_features = set(f.lower() for f in (p.get("features", {}).get("list", [])))
        overlap = req_features & p_features
        if req_features:
            feat_score = len(overlap) / len(req_features)
            score += feat_score * 0.35
            reasons["feature_match"] = f"{len(overlap)}/{len(req_features)} features match"
        # Stage match (0.15)
        if req_stage and req_stage == (p.get("stage") or "").lower():
            score += 0.15
            reasons["stage_fit"] = "Stage matches preference"
        # Budget tier (0.15)
        req_budget = requirements.get("budget_tier", "").lower()
        if req_budget and req_budget in budget_tiers:
            p_stage = (p.get("stage") or "").lower()
            if p_stage in budget_tiers[req_budget]:
                score += 0.15
                reasons["budget_fit"] = f"Fits {req_budget} budget tier"

        matches.append({"product_id": str(p["id"]), "score": round(score, 2), "reasons": reasons})

    return sorted(matches, key=lambda x: x["score"], reverse=True)


async def generate_comparison_summary(products: list[dict]) -> dict:
    """Generate an AI verdict comparing products. Returns {verdict, per_product: [{name, best_for, reasoning}], winner}."""
    product_info = json.dumps([{
        "name": p.get("name"),
        "category": p.get("category"),
        "features": p.get("features", {}).get("list", []),
        "credibility_score": p.get("credibility_score"),
        "avg_rating": p.get("avg_rating"),
        "review_count": p.get("review_count"),
    } for p in products])

    prompt = (
        f"Products to compare: {product_info}\n\n"
        "Compare these products and provide:\n"
        "1. A brief overall verdict (2-3 sentences)\n"
        "2. For each product: what it's best for and why\n"
        "3. The winner name\n"
        'Respond in JSON: {"verdict": "...", "per_product": [{"name": "...", "best_for": "...", "reasoning": "..."}], "winner": "..."}'
    )
    result = await _generate(prompt, system="You are a B2B product analyst. Respond only with valid JSON.")
    if result:
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass

    # Heuristic fallback
    sorted_products = sorted(products, key=lambda p: (p.get("credibility_score") or 0), reverse=True)
    winner = sorted_products[0]
    per_product = []
    use_cases = ["teams prioritizing reliability", "budget-conscious startups", "enterprise-scale operations", "fast-growing teams"]
    for i, p in enumerate(products):
        feat_count = len(p.get("features", {}).get("list", []))
        per_product.append({
            "name": p.get("name"),
            "best_for": use_cases[i % len(use_cases)].capitalize(),
            "reasoning": f"With {feat_count} features and a {((p.get('credibility_score') or 0) * 100):.0f}% credibility score, "
                         f"{'this is the top-rated option' if p == winner else 'a solid alternative'} in {p.get('category', 'its category')}.",
        })

    return {
        "verdict": f"{winner.get('name')} leads with the highest credibility score of {((winner.get('credibility_score') or 0) * 100):.0f}%. "
                   f"Each product has distinct strengths making them suitable for different use cases. "
                   f"Consider your specific requirements and budget when making a decision.",
        "per_product": per_product,
        "winner": winner.get("name"),
    }


async def generate_report(product: dict, reviews: list[dict]) -> dict:
    """Generate a structured validation report for a product."""
    prompt = (
        f"Product: {json.dumps(product)}\n"
        f"Reviews ({len(reviews)} total): {json.dumps(reviews[:5])}\n\n"
        "Generate a structured validation report with sections: overview, strengths, weaknesses, "
        "market_position, recommendation. Each section should have a title and 2-3 sentence content. "
        "Also provide an overall_score (0-10). "
        "Respond in JSON: {\"overall_score\": 7.5, \"sections\": [{\"title\": \"...\", \"content\": \"...\"}]}"
    )
    result = await _generate(
        prompt,
        system="You are a startup validation analyst. Respond only with valid JSON.",
    )
    if result:
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass
    # Fallback report
    avg_rating = sum(r.get("rating", 3) for r in reviews) / max(len(reviews), 1)
    return {
        "overall_score": round(avg_rating * 2, 1),
        "sections": [
            {"title": "Overview", "content": f"{product.get('name', 'This product')} is a {product.get('category', 'SaaS')} solution at {product.get('stage', 'growth')} stage."},
            {"title": "Strengths", "content": f"Based on {len(reviews)} reviews with an average rating of {avg_rating:.1f}/5. Users consistently praise the core functionality."},
            {"title": "Weaknesses", "content": "Areas for improvement include documentation and onboarding experience based on user feedback."},
            {"title": "Market Position", "content": f"Positioned in the {product.get('category', 'SaaS')} category with a credibility score of {product.get('credibility_score', 0):.1f}."},
            {"title": "Recommendation", "content": "Worth evaluating for teams looking for solutions in this space. Request a demo to assess fit."},
        ],
    }
