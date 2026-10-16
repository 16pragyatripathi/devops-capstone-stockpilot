import { money, number } from "../api.js";
import Icon from "../components/Icon.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const FILTERS = [["", "All"], ["in_stock", "In stock"], ["low_stock", "Low stock"], ["out_of_stock", "Out of stock"]];

export default function Products({ products, categories, filters, setFilters, loading, onAdjust, onEdit, onDelete }) {
  return (
    <section className="card">
      <div className="toolbar">
        <div className="chips" role="tablist">
          {FILTERS.map(([value, label]) => (
            <button key={value} className={`chip ${filters.status === value ? "active" : ""}`}
              onClick={() => setFilters({ ...filters, status: value })}>{label}</button>
          ))}
        </div>
        <select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th><th>Product</th><th>Category</th><th>Location</th>
              <th className="num">Qty</th><th className="num">Unit price</th><th>Status</th><th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td data-label="SKU" className="mono">{p.sku}</td>
                <td data-label="Product">
                  <div className="strong">{p.name}</div>
                  {p.supplier && <div className="muted small">{p.supplier}</div>}
                </td>
                <td data-label="Category">{p.category_name ?? <span className="muted">—</span>}</td>
                <td data-label="Location" className="mono">{p.location ?? "—"}</td>
                <td data-label="Qty" className="num">
                  <strong>{number(p.quantity)}</strong>
                  <div className="muted small">min {p.reorder_level}</div>
                </td>
                <td data-label="Unit price" className="num">{money(p.unit_price)}</td>
                <td data-label="Status"><StatusBadge status={p.status} /></td>
                <td className="actions">
                  <button className="icon-btn" title="Adjust stock" aria-label={`Adjust stock for ${p.name}`} onClick={() => onAdjust(p)}><Icon name="swap" /></button>
                  <button className="icon-btn" title="Edit" aria-label={`Edit ${p.name}`} onClick={() => onEdit(p)}><Icon name="edit" /></button>
                  <button className="icon-btn danger" title="Delete" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && products.length === 0 && <div className="empty">No products match these filters.</div>}
      </div>
    </section>
  );
}
