import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import PoiDetailPage from './pages/PoiDetailPage.jsx';
import MapPage from './pages/MapPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ExplorePage />} />
        <Route path="poi/:id" element={<PoiDetailPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
