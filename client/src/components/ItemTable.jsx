import StatusBadge from './StatusBadge.jsx';

// Inventory table. Calls onChange(id, +1 or -1) when a quantity button is clicked.
export default function ItemTable({ items, onChange }) {
  if (items.length === 0) {
    return <p className="empty">No items match. Try a different search or add an item.</p>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Expiry</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>
                <div className="qty">
                  <button aria-label={`Decrease ${item.name}`} disabled={item.quantity <= 0} onClick={() => onChange(item.id, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button aria-label={`Increase ${item.name}`} onClick={() => onChange(item.id, 1)}>+</button>
                </div>
              </td>
              <td>{item.unit}</td>
              <td>{item.expiryDate}</td>
              <td><StatusBadge item={item} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
