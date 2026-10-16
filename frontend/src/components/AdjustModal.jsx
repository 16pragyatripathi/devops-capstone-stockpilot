import { useState } from "react";
import { REASONS } from "../api.js";
import Modal from "./Modal.jsx";

export default function AdjustModal({ product, defaultReason = "restock", onSave, onClose }) {
  const [direction, setDirection] = useState(defaultReason === "sale" ? "out" : "in");
  const [amount, setAmount] = useState(defaultReason === "restock" ? Math.max(product.reorder_level * 2 - product.quantity, 1) : 1);
  const [reason, setReason] = useState(defaultReason);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const change = (direction === "in" ? 1 : -1) * Number(amount || 0);
  const after = product.quantity + change;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ change, reason, note: note || null });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Adjust stock · ${product.name}`}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="adjust-form" disabled={saving || after < 0 || !amount}>
            {saving ? "Saving…" : "Record movement"}
          </button>
        </>
      }
    >
      <form id="adjust-form" className="form-stack" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="segmented">
          <button type="button" className={direction === "in" ? "active" : ""} onClick={() => { setDirection("in"); setReason("restock"); }}>Stock in</button>
          <button type="button" className={direction === "out" ? "active" : ""} onClick={() => { setDirection("out"); setReason("sale"); }}>Stock out</button>
        </div>
        <label>Units<input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></label>
        <label>Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
          </select>
        </label>
        <label>Note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="PO-1182, order #42…" /></label>
        <div className={`preview ${after < 0 ? "bad" : ""}`}>
          <span>{product.quantity}</span><span>→</span><strong>{after}</strong><span>units on hand</span>
        </div>
      </form>
    </Modal>
  );
}
