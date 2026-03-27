import { getAccessToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Auth
export const register = (data: { email: string; password: string; name: string; role?: string }) =>
  fetchAPI<any>("/api/auth/register", { method: "POST", body: JSON.stringify(data) });

export const login = (data: { email: string; password: string }) =>
  fetchAPI<{ access_token: string; refresh_token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMe = () => fetchAPI<any>("/api/auth/me");

export const updateMe = (data: any) =>
  fetchAPI<any>("/api/auth/me", { method: "PUT", body: JSON.stringify(data) });

// Products
export const getProducts = (params?: string) =>
  fetchAPI<any[]>(`/api/products${params ? `?${params}` : ""}`);

export const getProduct = (slug: string) =>
  fetchAPI<any>(`/api/products/${slug}`);

export const createProduct = (data: any) =>
  fetchAPI<any>("/api/products", { method: "POST", body: JSON.stringify(data) });

// Launches
export const getLaunches = (sort = "trending") =>
  fetchAPI<any[]>(`/api/launches?sort=${sort}`);

export const getLeaderboard = (period = "daily") =>
  fetchAPI<any[]>(`/api/launches/leaderboard?period=${period}`);

export const createLaunch = (data: any) =>
  fetchAPI<any>("/api/launches", { method: "POST", body: JSON.stringify(data) });

export const toggleUpvote = (launchId: string, _userId?: string) =>
  fetchAPI<any>(`/api/launches/${launchId}/upvote`, { method: "POST" });

// Reviews
export const getReviews = (productId: string) =>
  fetchAPI<any[]>(`/api/reviews?product_id=${productId}`);

export const createReview = (data: any) =>
  fetchAPI<any>("/api/reviews", { method: "POST", body: JSON.stringify(data) });

export const compareProducts = (ids: string[]) =>
  fetchAPI<any>(`/api/compare?products=${ids.join(",")}`);

// Insights
export const getQuadrant = (category: string) =>
  fetchAPI<any>(`/api/insights/quadrant?category=${category}`);

export const getTrends = () =>
  fetchAPI<any>("/api/insights/trends");

export const generateReport = (productId: string) =>
  fetchAPI<any>(`/api/insights/report/${productId}`, { method: "POST" });

// Deals
export const getDeals = () =>
  fetchAPI<any[]>("/api/deals");

export const createDeal = (data: any) =>
  fetchAPI<any>("/api/deals", { method: "POST", body: JSON.stringify(data) });

// Payments
export const purchaseDeal = (dealId: string) =>
  fetchAPI<{ checkout_url: string; payment_id: string }>(`/api/payments/deals/${dealId}/purchase`, {
    method: "POST",
  });

export const getPayments = () =>
  fetchAPI<any[]>("/api/payments");

// Boosts
export const createBoost = (data: any) =>
  fetchAPI<{ checkout_url: string; payment_id: string }>("/api/boosts", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getBoosts = (productId?: string) =>
  fetchAPI<any[]>(`/api/boosts${productId ? `?product_id=${productId}` : ""}`);

// Matchmaking
export const runMatchmaking = (data: any) =>
  fetchAPI<any[]>("/api/matchmaking", { method: "POST", body: JSON.stringify(data) });

// Dashboard
export const getVendorDashboard = (userId: string) =>
  fetchAPI<any>(`/api/dashboard/${userId}`);

// Launch Wizard
export const previewLaunchContent = (data: any) =>
  fetchAPI<any>("/api/launches/preview", { method: "POST", body: JSON.stringify(data) });

export const createProductAndLaunch = (data: any) =>
  fetchAPI<any>("/api/launches/wizard", { method: "POST", body: JSON.stringify(data) });

// Compare AI Summary
export const getComparisonSummary = (ids: string[]) =>
  fetchAPI<any>(`/api/compare/summary?products=${ids.join(",")}`);

// Categories
export const getCategories = () =>
  fetchAPI<any[]>("/api/categories");

export const getCategory = (slug: string, params?: string) =>
  fetchAPI<any>(`/api/categories/${slug}${params ? `?${params}` : ""}`);

// Search
export const search = (query: string, type = "all", limit = 20) =>
  fetchAPI<any>(`/api/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);

// Comments
export const getComments = (launchId: string) =>
  fetchAPI<any[]>(`/api/launches/${launchId}/comments`);

export const createComment = (launchId: string, data: { body: string; parent_id?: string }) =>
  fetchAPI<any>(`/api/launches/${launchId}/comments`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// Analytics
export const trackEvents = (events: any[]) =>
  fetchAPI<any>("/api/events", { method: "POST", body: JSON.stringify({ events }) });
