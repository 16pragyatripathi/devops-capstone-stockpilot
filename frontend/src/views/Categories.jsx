import { useState } from "react";
import Icon from "../components/Icon.jsx";

export default function Categories({ categories, onCreate, onDelete }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onCreate({ name, description: description || null });
      setName("");
      setDescription("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid-2 grid-2-wide">
      <div className="card">
        <div className="card-header"><h3>All categories</h3></div>
        <ul className="category-list">
          {categories.map((c) => (
            <li key={c.id}>
              <div className="category-dot"><Icon name="tag" size={16} /></div>
              <div className="grow">
                <div className="strong">{c.name}</div>
                <div className="muted small">{c.description || "No description"}</div>
              </div>
              <span className="tag">{c.product_count} products</span>
              <button className="icon-btn danger" aria-label={`Delete ${c.name}`} onClick={() => onDelete(c)}><Icon name="trash" /></button>
            </li>
          ))}
          {categories.length === 0 && <li className="empty">No categories yet.</li>}
        </ul>
      </div>
      <form className="card form-stack" onSubmit={submit}>
        <div className="card-header"><h3>Add category</h3></div>
        {error && <div className="form-error">{error}</div>}
        <label>Name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Packaging" /></label>
        <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Boxes, tape, bubble wrap" /></label>
        <button className="btn btn-primary"><Icon name="plus" /> Add category</button>
      </form>
    </section>
  );
}
