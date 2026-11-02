// Works out which statuses apply to an item. An item can have more than one.
export function getStatuses(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((new Date(item.expiryDate + 'T00:00:00') - today) / 86400000);

  const statuses = [];
  if (daysLeft < 0) statuses.push('Expired');
  else if (daysLeft <= 7) statuses.push('Expiring Soon');
  if (item.quantity <= item.lowStockThreshold) statuses.push('Low Stock');
  if (statuses.length === 0) statuses.push('OK');
  return statuses;
}

const classFor = { 'Expired': 'danger', 'Expiring Soon': 'warn', 'Low Stock': 'warn', 'OK': 'ok' };

// Shows one coloured badge per status.
export default function StatusBadge({ item }) {
  return (
    <>
      {getStatuses(item).map((s) => (
        <span key={s} className={`badge badge-${classFor[s]}`}>{s}</span>
      ))}
    </>
  );
}
