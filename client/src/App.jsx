import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import BuyerLogin from './pages/BuyerLogin.jsx';
import BuyerRegister from './pages/BuyerRegister.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import LowStock from './pages/LowStock.jsx';
import ExpiryAlerts from './pages/ExpiryAlerts.jsx';
import Activity from './pages/Activity.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import BuyerDashboard from './pages/BuyerDashboard.jsx';
import BuyerShopping from './pages/BuyerShopping.jsx';
import PortalLogin from './pages/PortalLogin.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import BuyerSettings from './pages/BuyerSettings.jsx';
import BuyerProfile from './pages/BuyerProfile.jsx';
import OAuthCallback from './pages/OAuthCallback.jsx';
import PantryList from './pages/PantryList.jsx';
import Members from './pages/Members.jsx';
import { useAuth } from './auth/AuthContext.jsx';

export default function App() {
  const { status, user, portal, error } = useAuth();
  if (status === 'loading') return <main className="page" aria-busy="true">Checking your session…</main>;
  if (status === 'error') return <main className="page" role="alert">Unable to restore your session: {error}</main>;

  return (
    <Routes>
      <Route path="/login" element={<PortalLogin />} />
      <Route path="/register" element={<Register />} />
      <Route path="/owner/login" element={<Login />} />
      <Route path="/owner/register" element={<Register />} />
      <Route path="/buyer/login" element={<BuyerLogin />} />
      <Route path="/buyer/register" element={<BuyerRegister />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/portal" element={<Navigate to="/login" replace />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Navigate to={portal === 'member' ? '/buyer/dashboard' : '/dashboard'} replace />} />
        <Route path="/pantries" element={<PantryList />} />
        <Route path="/dashboard" element={portal === 'owner' ? <Dashboard /> : <Navigate to="/buyer/dashboard" replace />} />
        <Route path="/inventory" element={portal === 'owner' ? <Inventory /> : <Navigate to="/buyer/dashboard" replace />} />
        <Route path="/low-stock" element={portal === 'owner' ? <LowStock /> : <Navigate to="/buyer/dashboard" replace />} />
        <Route path="/expiry-alerts" element={portal === 'owner' ? <ExpiryAlerts /> : <Navigate to="/buyer/dashboard" replace />} />
        <Route path="/members" element={portal === 'owner' ? <Members /> : <Navigate to="/buyer/dashboard" replace />} />
        <Route path="/activity" element={portal === 'owner' ? <Activity /> : <Navigate to="/buyer/dashboard" replace />} />
        <Route path="/settings" element={portal === 'owner' ? <Settings /> : <Navigate to="/buyer/dashboard" replace />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/profile" element={portal === 'owner' ? <Profile /> : <Navigate to="/buyer/profile" replace />} />
        <Route path="/buyer/dashboard" element={portal === 'member' ? <BuyerDashboard /> : <Navigate to="/dashboard" replace />} />
        <Route path="/buyer/shop" element={portal === 'member' ? <BuyerShopping /> : <Navigate to="/dashboard" replace />} />
        <Route path="/buyer/requests" element={<Navigate to="/buyer/shop" replace />} />
        <Route path="/buyer/orders" element={<Navigate to="/buyer/shop" replace />} />
        <Route path="/buyer/profile" element={portal === 'member' ? <BuyerProfile /> : <Navigate to="/dashboard" replace />} />
        <Route path="/buyer/settings" element={portal === 'member' ? <BuyerSettings /> : <Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? (portal === 'member' ? '/buyer/dashboard' : '/dashboard') : '/login'} replace />} />
    </Routes>
  );
}
