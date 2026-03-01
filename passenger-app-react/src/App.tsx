import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useStore } from './lib/store';
import { AuthScreen } from './components/AuthScreen';
import { StatusBar } from './components/StatusBar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { LocationModal } from './components/LocationModal';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { RideOptionsPage } from './pages/RideOptionsPage';
import { MatchingPage } from './pages/MatchingPage';
import { TripPage } from './pages/TripPage';
import { CompletePage } from './pages/CompletePage';
import { ActivityPage } from './pages/ActivityPage';
import { AccountPage } from './pages/AccountPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { PaymentMethodsPage } from './pages/PaymentMethodsPage';
import { AddPaymentPage } from './pages/AddPaymentPage';
import { SafetyPage } from './pages/SafetyPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { InvestorsPage } from './pages/InvestorsPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ background: '#0D0F14', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48 }}>🚕</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const locationPermission = useStore((s) => s.locationPermission);

  return (
    <div className="phone-frame" id="app">
      <ToastContainer />
      <StatusBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/ride-options" element={<RideOptionsPage />} />
        <Route path="/matching" element={<MatchingPage />} />
        <Route path="/trip" element={<TripPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/payment-methods" element={<PaymentMethodsPage />} />
        <Route path="/payment-methods/add" element={<AddPaymentPage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/investors" element={<InvestorsPage />} />
      </Routes>
      <BottomNav />
      {locationPermission === 'unknown' && <LocationModal />}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
