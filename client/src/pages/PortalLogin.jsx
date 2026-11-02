import { Link } from 'react-router-dom';
import { Boxes, ShoppingBag, ArrowRight, Soup } from 'lucide-react';

const groceries = [
  { icon: '🍎', className: 'grocery-one' },
  { icon: '🥖', className: 'grocery-two' },
  { icon: '🥛', className: 'grocery-three' },
  { icon: '🥬', className: 'grocery-four' },
  { icon: '🍅', className: 'grocery-five' },
  { icon: '🥚', className: 'grocery-six' },
  { icon: '🍚', className: 'grocery-seven' },
  { icon: '🥕', className: 'grocery-eight' },
  { icon: '🧀', className: 'grocery-nine' },
  { icon: '🍞', className: 'grocery-ten' },
  { icon: '🍋', className: 'grocery-eleven' },
  { icon: '🍌', className: 'grocery-twelve' },
  { icon: '🧅', className: 'grocery-thirteen' },
  { icon: '🌽', className: 'grocery-fourteen' },
  { icon: '🥔', className: 'grocery-fifteen' },
  { icon: '🍇', className: 'grocery-sixteen' },
];

export default function PortalLogin() {
  return (
    <main className="portal-login-page">
      <div className="grocery-background" aria-hidden="true">
        {groceries.map(({ icon, className }) => <span key={className} className={`floating-grocery ${className}`}>{icon}</span>)}
      </div>
      <div className="portal-login-heading">
        <div className="portal-logo"><Soup /></div>
        <div>
          <p className="portal-product-title">PantryPal</p>
          <h1>Choose your portal</h1>
          <span>Shared inventory for every pantry.</span>
          <div className="portal-delivery-tags">
            <span>Shared inventory</span><span>Pantry management</span><span>Member access</span>
          </div>
        </div>
      </div>

      <div className="portal-choice-grid">
        <section className="portal-choice owner-choice">
          <div className="portal-choice-icon"><Boxes /></div>
          <div>
            <span className="portal-order">01</span>
            <p className="eyebrow">Pantry administration</p>
            <h2>Owner Login</h2>
            <p>Manage pantries, inventory, members, low-stock items, and expiry alerts.</p>
          </div>
          <Link className="portal-choice-link" to="/owner/login">Continue as Owner <ArrowRight /></Link>
        </section>

        <section className="portal-choice buyer-choice">
          <div className="portal-choice-icon"><ShoppingBag /></div>
          <div>
            <span className="portal-order">02</span>
            <p className="eyebrow">Shared pantry access</p>
            <h2>Member Login</h2>
            <p>View shared pantry inventory, update item quantities, and access your member pantries.</p>
          </div>
          <Link className="portal-choice-link" to="/buyer/login">Continue as Member <ArrowRight /></Link>
        </section>
      </div>
    </main>
  );
}
