"""Seed script — populates the database with realistic SaaS startup data."""

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import settings
from app.database import Base
from app.models import Category, Deal, Launch, Product, Review, Upvote, User
from app.services.auth_service import hash_password
from app.services.scoring import compute_credibility_score, compute_trending_score

DEFAULT_PASSWORD = hash_password("demo1234")

# Fixed UUIDs for demo purposes
USER_IDS = [uuid.UUID(f"00000000-0000-0000-0000-{i:012d}") for i in range(1, 21)]

USERS = [
    {"id": USER_IDS[0], "email": "demo@launchdeck.app", "name": "Demo User", "role": "buyer", "company": "Acme Corp"},
    {"id": USER_IDS[1], "email": "alice@vortex.ai", "name": "Alice Chen", "role": "vendor", "company": "Vortex AI"},
    {"id": USER_IDS[2], "email": "bob@datapulse.io", "name": "Bob Martinez", "role": "vendor", "company": "DataPulse"},
    {"id": USER_IDS[3], "email": "carol@shieldops.co", "name": "Carol Washington", "role": "vendor", "company": "ShieldOps"},
    {"id": USER_IDS[4], "email": "dan@flowstep.com", "name": "Dan Kim", "role": "vendor", "company": "FlowStep"},
    {"id": USER_IDS[5], "email": "eve@synthai.dev", "name": "Eve Patel", "role": "vendor", "company": "SynthAI"},
    {"id": USER_IDS[6], "email": "frank@cloudnest.io", "name": "Frank Okoro", "role": "vendor", "company": "CloudNest"},
    {"id": USER_IDS[7], "email": "grace@metricly.com", "name": "Grace Liu", "role": "vendor", "company": "Metricly"},
    {"id": USER_IDS[8], "email": "hank@pipelineiq.ai", "name": "Hank Singh", "role": "vendor", "company": "PipelineIQ"},
    {"id": USER_IDS[9], "email": "iris@docspark.co", "name": "Iris Johansson", "role": "vendor", "company": "DocSpark"},
    {"id": USER_IDS[10], "email": "jake@autorev.ai", "name": "Jake Thompson", "role": "vendor", "company": "AutoRev"},
    {"id": USER_IDS[11], "email": "kate@hubstack.io", "name": "Kate Reyes", "role": "vendor", "company": "HubStack"},
    {"id": USER_IDS[12], "email": "leo@sigmatest.dev", "name": "Leo Fernandez", "role": "vendor", "company": "SigmaTest"},
    {"id": USER_IDS[13], "email": "maya@deepfin.ai", "name": "Maya Gupta", "role": "vendor", "company": "DeepFin"},
    {"id": USER_IDS[14], "email": "noah@collabware.co", "name": "Noah Andersen", "role": "vendor", "company": "CollabWare"},
    {"id": USER_IDS[15], "email": "buyer1@corp.com", "name": "Sarah Miller", "role": "buyer", "company": "TechCorp"},
    {"id": USER_IDS[16], "email": "buyer2@corp.com", "name": "James Wong", "role": "buyer", "company": "InnovateLtd"},
    {"id": USER_IDS[17], "email": "buyer3@corp.com", "name": "Priya Sharma", "role": "buyer", "company": "DataDriven Inc"},
    {"id": USER_IDS[18], "email": "buyer4@corp.com", "name": "Marcus Johnson", "role": "buyer", "company": "SecureNet"},
    {"id": USER_IDS[19], "email": "buyer5@corp.com", "name": "Lena Fischer", "role": "buyer", "company": "GrowthCo"},
]

PRODUCTS = [
    {
        "user_id": USER_IDS[1], "name": "Vortex AI", "slug": "vortex-ai",
        "tagline": "AI-powered code review and refactoring assistant",
        "description": "Vortex AI analyzes your codebase in real-time, suggesting improvements, catching bugs, and automating refactoring. Built for engineering teams shipping fast.",
        "website": "https://vortex.ai", "category": "DevTools", "stage": "B", "arr_range": "$5M-$10M",
        "features": {"list": ["Code analysis", "Auto-refactoring", "PR reviews", "Security scanning", "CI/CD integration"]},
    },
    {
        "user_id": USER_IDS[2], "name": "DataPulse", "slug": "datapulse",
        "tagline": "Real-time product analytics for growth teams",
        "description": "DataPulse gives you instant insights into user behavior, funnel performance, and retention metrics. No SQL required.",
        "website": "https://datapulse.io", "category": "Analytics", "stage": "A", "arr_range": "$1M-$5M",
        "features": {"list": ["Funnel analytics", "Cohort analysis", "A/B testing", "Real-time dashboards", "Integrations"]},
    },
    {
        "user_id": USER_IDS[3], "name": "ShieldOps", "slug": "shieldops",
        "tagline": "Automated cloud security posture management",
        "description": "ShieldOps continuously monitors your cloud infrastructure for misconfigurations, vulnerabilities, and compliance gaps.",
        "website": "https://shieldops.co", "category": "Security", "stage": "C", "arr_range": "$10M-$25M",
        "features": {"list": ["Cloud scanning", "Compliance monitoring", "Threat detection", "Auto-remediation", "RBAC", "SOC2 reporting"]},
    },
    {
        "user_id": USER_IDS[4], "name": "FlowStep", "slug": "flowstep",
        "tagline": "No-code workflow automation for ops teams",
        "description": "FlowStep lets operations teams build complex workflows visually. Connect 200+ integrations without writing code.",
        "website": "https://flowstep.com", "category": "DevTools", "stage": "B", "arr_range": "$5M-$10M",
        "features": {"list": ["Visual builder", "200+ integrations", "Conditional logic", "Error handling", "Team collaboration"]},
    },
    {
        "user_id": USER_IDS[5], "name": "SynthAI", "slug": "synthai",
        "tagline": "Enterprise AI model management and deployment",
        "description": "SynthAI provides a unified platform for training, evaluating, and deploying ML models at scale.",
        "website": "https://synthai.dev", "category": "AI/ML", "stage": "C", "arr_range": "$10M-$25M",
        "features": {"list": ["Model registry", "A/B deployment", "Monitoring", "Auto-scaling", "GPU orchestration", "Experiment tracking"]},
    },
    {
        "user_id": USER_IDS[6], "name": "CloudNest", "slug": "cloudnest",
        "tagline": "Simplified Kubernetes management for startups",
        "description": "CloudNest abstracts away Kubernetes complexity. Deploy, scale, and monitor containers with a beautiful UI.",
        "website": "https://cloudnest.io", "category": "Infrastructure", "stage": "A", "arr_range": "$1M-$5M",
        "features": {"list": ["One-click deploy", "Auto-scaling", "Monitoring", "Cost optimization", "Multi-cloud"]},
    },
    {
        "user_id": USER_IDS[7], "name": "Metricly", "slug": "metricly",
        "tagline": "Revenue analytics and forecasting for SaaS",
        "description": "Metricly connects to your billing system and gives you accurate MRR, churn, LTV, and revenue forecasts.",
        "website": "https://metricly.com", "category": "Analytics", "stage": "B", "arr_range": "$5M-$10M",
        "features": {"list": ["MRR tracking", "Churn analysis", "Revenue forecasting", "Cohort metrics", "Investor dashboards"]},
    },
    {
        "user_id": USER_IDS[8], "name": "PipelineIQ", "slug": "pipelineiq",
        "tagline": "AI sales intelligence and pipeline management",
        "description": "PipelineIQ uses AI to score leads, predict deal outcomes, and optimize your entire sales funnel.",
        "website": "https://pipelineiq.ai", "category": "Sales", "stage": "B", "arr_range": "$5M-$10M",
        "features": {"list": ["Lead scoring", "Deal prediction", "Pipeline analytics", "CRM sync", "Email intelligence"]},
    },
    {
        "user_id": USER_IDS[9], "name": "DocSpark", "slug": "docspark",
        "tagline": "AI-powered documentation generator for APIs",
        "description": "DocSpark auto-generates beautiful, interactive API docs from your codebase. Keeps docs in sync with your code.",
        "website": "https://docspark.co", "category": "DevTools", "stage": "A", "arr_range": "$500K-$1M",
        "features": {"list": ["Auto-generation", "Interactive playground", "Versioning", "Custom themes", "OpenAPI support"]},
    },
    {
        "user_id": USER_IDS[10], "name": "AutoRev", "slug": "autorev",
        "tagline": "Automated revenue operations platform",
        "description": "AutoRev unifies billing, subscription management, and revenue recognition into a single platform.",
        "website": "https://autorev.ai", "category": "Sales", "stage": "C", "arr_range": "$10M-$25M",
        "features": {"list": ["Billing automation", "Subscription management", "Revenue recognition", "Dunning", "Tax compliance"]},
    },
    {
        "user_id": USER_IDS[11], "name": "HubStack", "slug": "hubstack",
        "tagline": "Customer success platform with health scoring",
        "description": "HubStack helps CS teams proactively manage accounts with AI-driven health scores and playbooks.",
        "website": "https://hubstack.io", "category": "Sales", "stage": "A", "arr_range": "$1M-$5M",
        "features": {"list": ["Health scoring", "Playbooks", "NPS tracking", "Churn prediction", "Timeline view"]},
    },
    {
        "user_id": USER_IDS[12], "name": "SigmaTest", "slug": "sigmatest",
        "tagline": "AI-powered end-to-end testing platform",
        "description": "SigmaTest generates and maintains test suites using AI. Catches regressions before they reach production.",
        "website": "https://sigmatest.dev", "category": "DevTools", "stage": "A", "arr_range": "$1M-$5M",
        "features": {"list": ["AI test generation", "Visual regression", "CI/CD integration", "Flake detection", "Parallel execution"]},
    },
    {
        "user_id": USER_IDS[13], "name": "DeepFin", "slug": "deepfin",
        "tagline": "AI-driven financial modeling for startups",
        "description": "DeepFin automates financial modeling, scenario planning, and investor reporting for venture-backed startups.",
        "website": "https://deepfin.ai", "category": "Analytics", "stage": "B", "arr_range": "$5M-$10M",
        "features": {"list": ["Financial modeling", "Scenario planning", "Investor reports", "Budget tracking", "Benchmarking"]},
    },
    {
        "user_id": USER_IDS[14], "name": "CollabWare", "slug": "collabware",
        "tagline": "Async-first team collaboration for remote teams",
        "description": "CollabWare combines async video, docs, and project management into a unified workspace for distributed teams.",
        "website": "https://collabware.co", "category": "Collaboration", "stage": "B", "arr_range": "$5M-$10M",
        "features": {"list": ["Async video", "Shared docs", "Project boards", "Time zones", "Integrations", "Screen recording"]},
    },
    {
        "user_id": USER_IDS[5], "name": "PromptForge", "slug": "promptforge",
        "tagline": "Prompt engineering and LLM evaluation platform",
        "description": "PromptForge gives teams tools to craft, test, version, and evaluate prompts across multiple LLM providers.",
        "website": "https://promptforge.ai", "category": "AI/ML", "stage": "A", "arr_range": "$500K-$1M",
        "features": {"list": ["Prompt versioning", "Multi-model testing", "Evaluation metrics", "Team collaboration", "API gateway"]},
    },
]

REVIEW_TEMPLATES = [
    {"rating": 5, "title": "Game changer for our team", "content": "We've been using this for 6 months and it completely transformed our workflow. The AI features are genuinely useful, not just gimmicks. Integration was smooth.", "pros": ["Excellent AI features", "Easy integration", "Great support"], "cons": ["Steep learning curve initially"]},
    {"rating": 4, "title": "Solid product with room to grow", "content": "Very capable platform that delivers on most promises. The core features work well but some advanced features feel incomplete.", "pros": ["Strong core features", "Good documentation", "Active development"], "cons": ["Some features incomplete", "Could be faster"]},
    {"rating": 5, "title": "Best in class for our use case", "content": "After evaluating 5 competitors, this was the clear winner. Superior functionality and the pricing is fair for what you get.", "pros": ["Best feature set", "Fair pricing", "Reliable"], "cons": ["UI could be more polished"]},
    {"rating": 3, "title": "Decent but has issues", "content": "Does what it says on the tin, mostly. We've hit some performance issues at scale and support could be more responsive.", "pros": ["Works as advertised", "Good onboarding"], "cons": ["Performance issues at scale", "Slow support"]},
    {"rating": 4, "title": "Impressive for the price point", "content": "Great value. The feature set punches above its weight compared to enterprise alternatives costing 5x more.", "pros": ["Great value", "Feature-rich", "Modern UI"], "cons": ["Limited enterprise features"]},
    {"rating": 5, "title": "Our team loves it", "content": "Adoption across our 50-person eng team was incredibly smooth. The AI capabilities save us hours every week.", "pros": ["High team adoption", "Time savings", "AI is accurate"], "cons": ["Mobile app needed"]},
    {"rating": 2, "title": "Not ready for enterprise", "content": "We tried it but the lack of SSO, audit logs, and granular permissions made it a non-starter for our compliance requirements.", "pros": ["Good concept"], "cons": ["No SSO", "No audit logs", "Limited permissions"]},
    {"rating": 4, "title": "Really good after the latest update", "content": "The v2 release addressed most of our concerns. Performance is much better and the new features are exactly what we needed.", "pros": ["Major improvements in v2", "Better performance", "New features"], "cons": ["Migration was painful"]},
]

DEAL_TEMPLATES = [
    {"deal_type": "lifetime", "original_price": 499, "deal_price": 149, "max_redemptions": 200, "description": "Lifetime access to Pro plan. Includes all future updates and features."},
    {"deal_type": "discount", "original_price": 99, "deal_price": 49, "max_redemptions": 500, "description": "50% off annual plan for the first year. Perfect for small teams."},
    {"deal_type": "pilot", "original_price": 0, "deal_price": 0, "max_redemptions": 50, "description": "Free 90-day pilot with full feature access. No credit card required."},
    {"deal_type": "discount", "original_price": 299, "deal_price": 199, "max_redemptions": 300, "description": "33% off Enterprise plan. Includes priority support and custom integrations."},
    {"deal_type": "lifetime", "original_price": 999, "deal_price": 299, "max_redemptions": 100, "description": "Lifetime Enterprise deal. Up to 100 users, unlimited projects."},
]

CATEGORIES_HIERARCHY = {
    "Software": {
        "icon": "💻",
        "description": "All software categories",
        "children": {
            "DevTools": {
                "icon": "🛠️",
                "description": "Developer tools and platforms",
                "children": ["Code Review", "CI/CD", "Testing", "Documentation"],
            },
            "Analytics": {
                "icon": "📊",
                "description": "Analytics and data platforms",
                "children": ["Product Analytics", "Revenue Analytics", "BI & Reporting"],
            },
            "Security": {
                "icon": "🔒",
                "description": "Security and compliance tools",
                "children": ["Cloud Security", "Identity & Access", "Compliance"],
            },
            "AI/ML": {
                "icon": "🤖",
                "description": "Artificial intelligence and machine learning",
                "children": ["ML Platforms", "NLP Tools", "Computer Vision"],
            },
            "Sales": {
                "icon": "💰",
                "description": "Sales and revenue tools",
                "children": ["CRM", "Email Marketing", "SEO Tools", "Lead Generation"],
            },
            "Marketing": {
                "icon": "📣",
                "description": "Marketing tools and platforms",
                "children": ["Content Marketing", "Social Media", "Marketing Automation"],
            },
            "Infrastructure": {
                "icon": "☁️",
                "description": "Cloud infrastructure and DevOps",
                "children": ["Cloud Hosting", "Kubernetes", "Monitoring"],
            },
            "Collaboration": {
                "icon": "🤝",
                "description": "Team collaboration and productivity",
                "children": ["Project Management", "Communication", "Knowledge Base"],
            },
            "Finance": {
                "icon": "💳",
                "description": "Financial tools and platforms",
                "children": ["Billing & Invoicing", "Expense Management", "Financial Planning"],
            },
        },
    },
}

import random
random.seed(42)


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as db:
        # Check if already seeded
        from sqlalchemy import select, func
        count = (await db.execute(select(func.count(User.id)))).scalar()
        if count and count > 0:
            print(f"Database already has {count} users. Skipping seed.")
            return

        # Users
        for u in USERS:
            db.add(User(**u, password_hash=DEFAULT_PASSWORD))
        await db.flush()
        print(f"Created {len(USERS)} users")

        # Categories
        from slugify import slugify as make_slug
        category_map = {}  # name -> Category object
        cat_count = 0
        for root_name, root_data in CATEGORIES_HIERARCHY.items():
            root_cat = Category(
                name=root_name,
                slug=make_slug(root_name),
                description=root_data.get("description"),
                icon=root_data.get("icon"),
            )
            db.add(root_cat)
            await db.flush()
            category_map[root_name] = root_cat
            cat_count += 1

            for mid_name, mid_data in root_data.get("children", {}).items():
                mid_cat = Category(
                    name=mid_name,
                    slug=make_slug(mid_name),
                    description=mid_data.get("description"),
                    icon=mid_data.get("icon"),
                    parent_id=root_cat.id,
                )
                db.add(mid_cat)
                await db.flush()
                category_map[mid_name] = mid_cat
                cat_count += 1

                for leaf_name in mid_data.get("children", []):
                    leaf_cat = Category(
                        name=leaf_name,
                        slug=make_slug(leaf_name),
                        parent_id=mid_cat.id,
                    )
                    db.add(leaf_cat)
                    await db.flush()
                    category_map[leaf_name] = leaf_cat
                    cat_count += 1

        print(f"Created {cat_count} categories")

        # Products
        product_objects = []
        for p in PRODUCTS:
            product = Product(**p)
            db.add(product)
            product_objects.append(product)
        await db.flush()
        print(f"Created {len(PRODUCTS)} products")

        # Update category product_counts based on product.category matching category names
        category_product_counts = {}
        for product in product_objects:
            if product.category and product.category in category_map:
                cat_name = product.category
                category_product_counts[cat_name] = category_product_counts.get(cat_name, 0) + 1
        for cat_name, count in category_product_counts.items():
            category_map[cat_name].product_count = count
        await db.flush()
        print(f"Updated product counts for {len(category_product_counts)} categories")

        # Launches — one per product
        now = datetime.now(timezone.utc)
        launch_objects = []
        for i, product in enumerate(product_objects):
            launch = Launch(
                product_id=product.id,
                title=f"Introducing {product.name}",
                tagline=product.tagline,
                ai_tagline=f"{product.name} — Supercharge your {product.category or 'workflow'} with AI",
                description=product.description,
                ai_description=f"{product.name} is an innovative solution in the {product.category or 'SaaS'} space. {product.description}",
                status="live",
                launch_date=date.today() - timedelta(days=random.randint(0, 14)),
                upvote_count=random.randint(5, 200),
            )
            launch.trending_score = compute_trending_score(
                launch.upvote_count,
                now - timedelta(days=random.randint(0, 7)),
            )
            db.add(launch)
            launch_objects.append(launch)
        await db.flush()
        print(f"Created {len(launch_objects)} launches")

        # Upvotes — random upvotes on launches
        upvote_count = 0
        buyer_ids = USER_IDS[15:20]
        for launch in launch_objects:
            voters = random.sample(USER_IDS, min(launch.upvote_count, len(USER_IDS)))
            for voter_id in voters:
                db.add(Upvote(launch_id=launch.id, user_id=voter_id))
                upvote_count += 1
        await db.flush()
        print(f"Created {upvote_count} upvotes")

        # Reviews — 3-6 per product
        review_count = 0
        for product in product_objects:
            n_reviews = random.randint(3, 6)
            reviewers = random.sample(buyer_ids + USER_IDS[:5], min(n_reviews, 5))
            for reviewer_id in reviewers:
                template = random.choice(REVIEW_TEMPLATES)
                review = Review(
                    product_id=product.id,
                    user_id=reviewer_id,
                    rating=template["rating"],
                    title=template["title"],
                    content=template["content"],
                    pros=template["pros"],
                    cons=template["cons"],
                    sentiment_score=round((template["rating"] - 3) / 2.5, 2),
                    verification_score=round(random.uniform(0.5, 0.95), 2),
                    is_verified=template["rating"] >= 3,
                )
                db.add(review)
                review_count += 1
        await db.flush()
        print(f"Created {review_count} reviews")

        # Recompute credibility scores
        from sqlalchemy import func as sqla_func
        for product in product_objects:
            stats = (await db.execute(
                select(
                    sqla_func.avg(Review.rating),
                    sqla_func.count(Review.id),
                    sqla_func.avg(Review.verification_score),
                ).where(Review.product_id == product.id)
            )).one()
            avg_r, cnt, avg_v = stats
            if cnt and cnt > 0:
                import math
                product.credibility_score = compute_credibility_score(
                    avg_rating=float(avg_r),
                    review_count=int(cnt),
                    verification_avg=float(avg_v or 0),
                    engagement=min(math.log(cnt + 1) / math.log(51), 1.0),
                    consistency=round(random.uniform(0.4, 0.8), 2),
                )
        await db.flush()
        print("Recomputed credibility scores")

        # Deals — for ~10 products
        deal_count = 0
        for i, product in enumerate(product_objects[:10]):
            template = DEAL_TEMPLATES[i % len(DEAL_TEMPLATES)]
            deal = Deal(
                product_id=product.id,
                title=f"{product.name} — {'Lifetime' if template['deal_type'] == 'lifetime' else 'Special'} Deal",
                description=template["description"],
                deal_type=template["deal_type"],
                original_price=template["original_price"],
                deal_price=template["deal_price"],
                max_redemptions=template["max_redemptions"],
                current_redemptions=random.randint(0, template["max_redemptions"] // 3),
                expires_at=now + timedelta(days=random.randint(14, 90)),
            )
            db.add(deal)
            deal_count += 1
        await db.flush()
        print(f"Created {deal_count} deals")

        await db.commit()
        print("\nSeed complete!")

        # Auto-compute badges
        from app.services.badge_service import compute_badges
        badge_count = await compute_badges(db)
        await db.commit()
        print(f"Awarded {badge_count} badges")


if __name__ == "__main__":
    asyncio.run(seed())
