from pydantic import BaseModel


class QuadrantProduct(BaseModel):
    id: str
    name: str
    slug: str
    x: float  # vision/completeness
    y: float  # ability to execute / credibility
    category: str | None
    stage: str | None


class QuadrantData(BaseModel):
    category: str
    products: list[QuadrantProduct]


class TrendItem(BaseModel):
    name: str
    slug: str | None = None
    score: float
    change: float  # % change


class TrendsData(BaseModel):
    trending_products: list[TrendItem]
    trending_categories: list[TrendItem]


class ReportSection(BaseModel):
    title: str
    content: str


class ValidationReport(BaseModel):
    product_name: str
    overall_score: float
    sections: list[ReportSection]
