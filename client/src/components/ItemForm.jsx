import { useState } from 'react';
import { categories, quantityUnits } from '../data/categories.js';
import { getLocalDateString, isTodayOrFutureDate } from '../utils/date.js';

const empty = { name: '', category: categories[0], quantity: '', unit: quantityUnits[0].value, expiryDate: '', lowStockThreshold: '' };

// Add-item form with frontend validation. Calls onAdd(newItem) when valid.
export default function ItemForm({ onAdd }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.unit) e.unit = 'Select a unit';
    if (form.quantity === '' || !Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) e.quantity = 'Enter a quantity greater than 0';
    if (form.lowStockThreshold === '' || !Number.isFinite(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) e.lowStockThreshold = 'Enter a threshold of 0 or more';
    if (!form.expiryDate || !isTodayOrFutureDate(form.expiryDate)) e.expiryDate = 'Select today or a future expiry date';
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
        <input name="quantity" type="number" min="0.01" step="any" value={form.quantity} onChange={update} required />
        {errors.quantity && <span className="error">{errors.quantity}</span>}
      </label>
      <label>Unit
        <select name="unit" value={form.unit} onChange={update}>
          {quantityUnits.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
        </select>
        {errors.unit && <span className="error">{errors.unit}</span>}
      </label>
      <label>Expiry date
        <input name="expiryDate" type="date" min={getLocalDateString()} value={form.expiryDate} onChange={update} required />
        {errors.expiryDate && <span className="error">{errors.expiryDate}</span>}
      </label>
      <label>Low-stock threshold
        <input name="lowStockThreshold" type="number" min="0" step="any" value={form.lowStockThreshold} onChange={update} required />
        {errors.lowStockThreshold && <span className="error">{errors.lowStockThreshold}</span>}
      </label>
      <button className="btn" type="submit">Add item</button>
    </form>
  );
}
