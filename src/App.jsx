import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="achievement" element={<Achievement />} />
          <Route path="prospect" element={<Prospect />} />
          <Route path="coverage" element={<Coverage />} />
          <Route path="omniflow" element={<Omniflow />} />

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
  );
}

export default App;
