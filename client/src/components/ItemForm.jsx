import { useState } from 'react';
import { categories } from '../data/mockData.js';

const empty = { name: '', category: categories[0], quantity: '', unit: '', expiryDate: '', lowStockThreshold: '' };

// Add-item form with frontend validation. Calls onAdd(newItem) when valid.
export default function ItemForm({ onAdd }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.unit.trim()) e.unit = 'Unit is required';
    if (form.quantity === '' || Number(form.quantity) < 0) e.quantity = 'Enter a quantity of 0 or more';
    if (form.lowStockThreshold === '' || Number(form.lowStockThreshold) < 0) e.lowStockThreshold = 'Enter a threshold of 0 or more';
    if (!form.expiryDate) e.expiryDate = 'Expiry date is required';
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onAdd({
      ...form,
      name: form.name.trim(),
      unit: form.unit.trim(),
      quantity: Number(form.quantity),
      lowStockThreshold: Number(form.lowStockThreshold),
    });
    setForm(empty);
  };

  return (
    <form className="card form-grid" onSubmit={handleSubmit} noValidate>
      <label>Name
        <input name="name" value={form.name} onChange={update} />
        {errors.name && <span className="error">{errors.name}</span>}
      </label>
      <label>Category
        <select name="category" value={form.category} onChange={update}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>Quantity
        <input name="quantity" type="number" min="0" value={form.quantity} onChange={update} />
        {errors.quantity && <span className="error">{errors.quantity}</span>}
      </label>
      <label>Unit
        <input name="unit" placeholder="kg, pcs, litres" value={form.unit} onChange={update} />
        {errors.unit && <span className="error">{errors.unit}</span>}
      </label>
      <label>Expiry date
        <input name="expiryDate" type="date" value={form.expiryDate} onChange={update} />
        {errors.expiryDate && <span className="error">{errors.expiryDate}</span>}
      </label>
      <label>Low-stock threshold
        <input name="lowStockThreshold" type="number" min="0" value={form.lowStockThreshold} onChange={update} />
        {errors.lowStockThreshold && <span className="error">{errors.lowStockThreshold}</span>}
      </label>
      <button className="btn" type="submit">Add item</button>
    </form>
  );
}
