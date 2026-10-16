import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import AdjustModal from "./components/AdjustModal.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import Icon from "./components/Icon.jsx";
import ProductModal from "./components/ProductModal.jsx";
import Categories from "./views/Categories.jsx";
import Dashboard from "./views/Dashboard.jsx";
import Movements from "./views/Movements.jsx";
import Products from "./views/Products.jsx";

const NAV = [
  ["dashboard", "Dashboard", "dashboard"],
  ["products", "Products", "box"],
  ["movements", "Stock movements", "activity"],
  ["categories", "Categories", "tag"],
];
const TITLES = {
  dashboard: ["Inventory overview", "Live stock levels, value and reorder alerts · running on AWS EKS"],
  products: ["Products", "Catalogue, stock on hand and pricing"],
  movements: ["Stock movements", "Audit trail of every stock change"],
  categories: ["Categories", "Group products for reporting"],
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", category_id: "" });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (message, tone = "ok") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3200);
  };

  const loadAll = useCallback(async () => {
    try {
      const [s, all, cats, moves] = await Promise.all([
        api.stats(), api.products(), api.categories(), api.movements({ limit: 100 }),
      ]);
      setStats(s);
      setAllProducts(all);
      setCategories(cats);
      setMovements(moves);
      setApiError("");
    } catch (err) {
      setApiError(err.message || "Backend unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await api.products(filters));
    } catch (err) {
      setApiError(err.message);
    }
  }, [filters]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    const t = setTimeout(loadProducts, 200); // debounce search typing
    return () => clearTimeout(t);
  }, [loadProducts]);

  const refresh = async () => { await Promise.all([loadAll(), loadProducts()]); };
  const close = () => setModal(null);
  const goTo = (next, status) => {
    setView(next);
    setNavOpen(false);
    if (status !== undefined) setFilters({ ...filters, status });
  };

  const saveProduct = async (body) => {
    if (modal.product) {
      await api.updateProduct(modal.product.id, body);
      notify(`Updated ${body.name}`);
    } else {
      await api.createProduct(body);
      notify(`Created ${body.name}`);
    }
    close();
    refresh();
  };

  const adjust = async (body) => {
    const updated = await api.adjustStock(modal.product.id, body);
    notify(`${updated.name}: ${body.change > 0 ? "+" : ""}${body.change} → ${updated.quantity} on hand`);
    close();
    refresh();
  };

  const [title, subtitle] = TITLES[view];

  return (
    <div className={`layout ${navOpen ? "nav-open" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="layers" size={20} /></div>
          <div>
            <div className="brand-name">StockPilot</div>
            <div className="brand-sub">Inventory Cloud</div>
          </div>
        </div>
        <nav>
          {NAV.map(([key, label, icon]) => (
            <button key={key} className={`nav-item ${view === key ? "active" : ""}`} onClick={() => goTo(key)}>
              <Icon name={icon} /> {label}
              {key === "products" && stats && stats.low_stock + stats.out_of_stock > 0 && (
                <span className="nav-count">{stats.low_stock + stats.out_of_stock}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="pipeline">
          <div className="pipeline-title">Delivery pipeline</div>
          {["Tests", "Build", "Trivy", "GHCR", "Helm"].map((step) => (
            <div key={step} className="pipeline-step"><span className="dot" />{step}</div>
          ))}
          <div className={`api-status ${apiError ? "down" : "up"}`}>
            <span className="dot" /> API {apiError ? "unreachable" : "healthy"}
          </div>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
          <div className="title">
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          <div className="topbar-actions">
            {view === "products" && (
              <div className="search">
                <Icon name="search" size={16} />
                <input placeholder="Search name, SKU, supplier" value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })} aria-label="Search products" />
              </div>
            )}
            <button className="icon-btn" onClick={refresh} aria-label="Refresh"><Icon name="refresh" /></button>
            <button className="btn btn-primary" onClick={() => setModal({ type: "product" })}>
              <Icon name="plus" /> <span className="hide-sm">New product</span>
            </button>
          </div>
        </header>

        {apiError && (
          <div className="banner">
            <Icon name="alert" /> Cannot reach the StockPilot API ({apiError}).
            <button className="link" onClick={refresh}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="skeleton-grid">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton" />)}</div>
        ) : (
          <>
            {view === "dashboard" && (
              <Dashboard stats={stats} products={allProducts} movements={movements} goTo={goTo}
                onRestock={(p) => setModal({ type: "adjust", product: p, reason: "restock" })} />
            )}
            {view === "products" && (
              <Products products={products} categories={categories} filters={filters} setFilters={setFilters} loading={loading}
                onAdjust={(p) => setModal({ type: "adjust", product: p, reason: "sale" })}
                onEdit={(p) => setModal({ type: "product", product: p })}
                onDelete={(p) => setModal({ type: "delete-product", product: p })} />
            )}
            {view === "movements" && <Movements movements={movements} />}
            {view === "categories" && (
              <Categories categories={categories}
                onCreate={async (body) => { await api.createCategory(body); notify(`Added ${body.name}`); refresh(); }}
                onDelete={(c) => setModal({ type: "delete-category", category: c })} />
            )}
          </>
        )}
      </main>

      {modal?.type === "product" && (
        <ProductModal product={modal.product} categories={categories} onSave={saveProduct} onClose={close} />
      )}
      {modal?.type === "adjust" && (
        <AdjustModal product={modal.product} defaultReason={modal.reason} onSave={adjust} onClose={close} />
      )}
      {modal?.type === "delete-product" && (
        <ConfirmModal title="Delete product" onClose={close}
          message={`Delete ${modal.product.name} (${modal.product.sku}) and its stock history? This cannot be undone.`}
          onConfirm={async () => { await api.deleteProduct(modal.product.id); notify(`Deleted ${modal.product.name}`); close(); refresh(); }} />
      )}
      {modal?.type === "delete-category" && (
        <ConfirmModal title="Delete category" onClose={close}
          message={`Delete ${modal.category.name}? Its ${modal.category.product_count} products are kept and become uncategorised.`}
          onConfirm={async () => { await api.deleteCategory(modal.category.id); notify(`Deleted ${modal.category.name}`); close(); refresh(); }} />
      )}

      {toast && <div className={`toast toast-${toast.tone}`} role="status"><Icon name="check" /> {toast.message}</div>}
    </div>
  );
}
