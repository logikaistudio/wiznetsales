import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Achievement from './pages/Achievement';
import Prospect from './pages/Prospect';
import Coverage from './pages/Coverage';
import Omniflow from './pages/Omniflow';
import MasterData from './pages/MasterData';
import PersonIncharge from './pages/master-data/PersonIncharge';
import Targets from './pages/master-data/Targets';
import CoverageManagement from './pages/master-data/CoverageManagement';
import ProductManagement from './pages/master-data/ProductManagement';
import Promo from './pages/master-data/Promo';
import HotNews from './pages/master-data/HotNews';
import UserManagement from './pages/master-data/UserManagement';
import ApplicationSettings from './pages/master-data/ApplicationSettings';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Basic route protection based on permission
const ProtectedRoute = ({ children }) => {
  const { user, loading, canAccessRoute } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-900" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Basic route protection based on role/permission
  if (!canAccessRoute(location.pathname)) {
    // If user tries to access restricted page, redirect to their home or show unauthorized
    // Simple fallback: redirect to home (dashboard)
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="achievement" element={<Achievement />} />
            <Route path="prospect" element={<Prospect />} />
            <Route path="coverage" element={<Coverage />} />

            {/* Omniflow */}
            <Route path="omniflow" element={<Omniflow />} />

            {/* User Management */}
            <Route path="user-management" element={<UserManagement />} />
            <Route path="application-settings" element={<ApplicationSettings />} />

            <Route path="master-data">
              <Route index element={<Navigate to="person-incharge" replace />} />
              <Route path="person-incharge" element={<PersonIncharge />} />
              <Route path="targets" element={<Targets />} />
              <Route path="coverage-management" element={<CoverageManagement />} />
              <Route path="product-management" element={<ProductManagement />} />
              <Route path="promo" element={<Promo />} />
              <Route path="hotnews" element={<HotNews />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
