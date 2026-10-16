// All calls are relative (/api/...): Nginx, the Vite dev proxy or the Kubernetes
// Ingress decides where the backend actually lives.
async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(", ")
      : detail || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

const qs = (params) => {
  const clean = Object.entries(params).filter(([, v]) => v !== "" && v != null);
  return clean.length ? `?${new URLSearchParams(clean)}` : "";
};

export const api = {
  info: () => request("/api/health"),
  stats: () => request("/api/stats"),
  products: (filters = {}) => request(`/api/products${qs(filters)}`),
  createProduct: (body) => request("/api/products", { method: "POST", body }),
  updateProduct: (id, body) => request(`/api/products/${id}`, { method: "PUT", body }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  adjustStock: (id, body) => request(`/api/products/${id}/adjust`, { method: "POST", body }),
  movements: (params = {}) => request(`/api/movements${qs(params)}`),
  categories: () => request("/api/categories"),
  createCategory: (body) => request("/api/categories", { method: "POST", body }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: "DELETE" }),
};

export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n ?? 0);

export const number = (n) => new Intl.NumberFormat("en-US").format(n ?? 0);

export const timeAgo = (iso) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units = [["d", 86400], ["h", 3600], ["m", 60]];
  for (const [label, size] of units) if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  return "just now";
};

export const STATUS_LABEL = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" };
export const REASONS = ["restock", "sale", "return", "adjustment", "damaged"];
