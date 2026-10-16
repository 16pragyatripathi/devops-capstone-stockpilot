import { money, number, timeAgo } from "../api.js";
import Icon from "../components/Icon.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

function Kpi({ icon, label, value, sub, tone }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ""}`}>
      <div className="kpi-icon"><Icon name={icon} /></div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard({ stats, products, movements, onRestock, goTo }) {
  const reorder = products
    .filter((p) => p.status !== "in_stock")
    .sort((a, b) => a.quantity - a.reorder_level - (b.quantity - b.reorder_level))
    .slice(0, 6);
  const maxValue = Math.max(1, ...(stats?.value_by_category ?? []).map((c) => c.value));

  return (
    <>
      <section className="kpi-grid">
        <Kpi icon="box" label="Products" value={number(stats?.total_products)} sub={`${stats?.categories ?? 0} categories`} />
        <Kpi icon="layers" label="Units on hand" value={number(stats?.total_units)} />
        <Kpi icon="dollar" label="Inventory value" value={money(stats?.inventory_value)} />
        <Kpi icon="alert" label="Low stock" value={number(stats?.low_stock)} tone="warn" sub="at or below reorder level" />
        <Kpi icon="x" label="Out of stock" value={number(stats?.out_of_stock)} tone="danger" />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Needs reorder</h3>
            <button className="link" onClick={() => goTo("products", "low_stock")}>View all</button>
          </div>
          {reorder.length === 0 ? (
            <div className="empty"><Icon name="check" /> Everything is above its reorder level.</div>
          ) : (
            <ul className="reorder-list">
              {reorder.map((p) => (
                <li key={p.id}>
                  <div>
                    <div className="strong">{p.name}</div>
                    <div className="muted small">{p.sku} · {p.quantity} of {p.reorder_level} min</div>
                  </div>
                  <StatusBadge status={p.status} />
                  <button className="btn btn-sm" onClick={() => onRestock(p)}>Restock</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>Value by category</h3></div>
          {(stats?.value_by_category ?? []).length === 0 ? (
            <div className="empty">No stock yet.</div>
          ) : (
            <ul className="bars">
              {stats.value_by_category.map((c) => (
                <li key={c.category}>
                  <div className="bar-label"><span>{c.category}</span><span className="muted">{money(c.value)}</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.value / maxValue) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Recent stock activity</h3>
          <button className="link" onClick={() => goTo("movements")}>Full history</button>
        </div>
        <ul className="feed">
          {movements.slice(0, 8).map((m) => (
            <li key={m.id}>
              <span className={`delta ${m.change > 0 ? "in" : "out"}`}>{m.change > 0 ? `+${m.change}` : m.change}</span>
              <div className="feed-text">
                <span className="strong">{m.product_name}</span>
                <span className="muted"> · {m.reason}{m.note ? ` — ${m.note}` : ""}</span>
              </div>
              <span className="muted small">{timeAgo(m.created_at)}</span>
            </li>
          ))}
          {movements.length === 0 && <li className="empty">No movements recorded yet.</li>}
        </ul>
      </section>
    </>
  );
}
