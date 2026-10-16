import { timeAgo } from "../api.js";

export default function Movements({ movements }) {
  return (
    <section className="card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>When</th><th>Product</th><th>Reason</th><th className="num">Change</th><th className="num">On hand after</th><th>Note</th></tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td data-label="When" title={new Date(m.created_at).toLocaleString()}>{timeAgo(m.created_at)}</td>
                <td data-label="Product"><div className="strong">{m.product_name}</div><div className="muted small mono">{m.product_sku}</div></td>
                <td data-label="Reason"><span className="tag">{m.reason}</span></td>
                <td data-label="Change" className="num"><span className={`delta ${m.change > 0 ? "in" : "out"}`}>{m.change > 0 ? `+${m.change}` : m.change}</span></td>
                <td data-label="After" className="num">{m.quantity_after}</td>
                <td data-label="Note" className="muted">{m.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <div className="empty">No stock movements yet.</div>}
      </div>
    </section>
  );
}
