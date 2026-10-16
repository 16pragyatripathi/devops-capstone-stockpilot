import { useState } from "react";
import Modal from "./Modal.jsx";

const EMPTY = {
  sku: "", name: "", description: "", category_id: "", quantity: 0,
  reorder_level: 10, unit_price: 0, supplier: "", location: "",
};

export default function ProductModal({ product, categories, onSave, onClose }) {
  const editing = Boolean(product);
  const [form, setForm] = useState(() =>
    editing ? { ...EMPTY, ...product, category_id: product.category_id ?? "" } : EMPTY,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description || null,
      category_id: form.category_id === "" ? null : Number(form.category_id),
      reorder_level: Number(form.reorder_level),
      unit_price: Number(form.unit_price),
      supplier: form.supplier || null,
      location: form.location || null,
    };
    if (!editing) body.quantity = Number(form.quantity);
    try {
      await onSave(body);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? `Edit ${product.name}` : "New product"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="product-form" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
          </button>
        </>
      }
    >
      <form id="product-form" className="form-grid" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label>SKU<input required value={form.sku} onChange={set("sku")} placeholder="ELEC-1005" pattern="[A-Za-z0-9\-_]+" /></label>
        <label>Name<input required value={form.name} onChange={set("name")} placeholder="Bluetooth Headset" /></label>
        <label>Category
          <select value={form.category_id} onChange={set("category_id")}>
            <option value="">Uncategorised</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Supplier<input value={form.supplier ?? ""} onChange={set("supplier")} placeholder="Supplier name" /></label>
        {!editing && (
          <label>Opening quantity<input type="number" min="0" required value={form.quantity} onChange={set("quantity")} /></label>
        )}
        <label>Reorder level<input type="number" min="0" required value={form.reorder_level} onChange={set("reorder_level")} /></label>
        <label>Unit price (USD)<input type="number" min="0" step="0.01" required value={form.unit_price} onChange={set("unit_price")} /></label>
        <label>Bin location<input value={form.location ?? ""} onChange={set("location")} placeholder="A1-03" /></label>
        <label className="span-2">Description
          <textarea rows="2" value={form.description ?? ""} onChange={set("description")} />
        </label>
        {editing && <p className="hint span-2">Quantity changes go through “Adjust stock”, so every change is recorded.</p>}
      </form>
    </Modal>
  );
}
