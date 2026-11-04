import { NavLink, Outlet, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { USE_MOCK } from '../api/index.js';
import ConsentBanner from '../features/privacy/ConsentBanner.jsx';
import { initAnalytics } from '../features/privacy/analyticsClient.js';

const NAV = [
  { to: '/', label: 'explore', end: true },
  { to: '/map', label: 'map' },
  { to: '/privacy', label: 'privacy' },
];

export default function AppLayout() {
  const { language, setLanguage, t } = useLanguage();
  useEffect(() => initAnalytics({ enabled: !USE_MOCK }), []);
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">Saigon Stories <span>{t.district}</span></Link>
        <nav aria-label={t.navigation} className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>{t[n.label]}</NavLink>
          ))}
        </nav>
        <label className="language-picker">{t.uiLanguage}
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="vi">Tiếng Việt</option><option value="en">English</option>
          </select>
        </label>
      </header>
      <main className="content">
        {USE_MOCK && <p className="mode-notice" role="status">{t.mockNotice}</p>}
        <Outlet />
      </main>
      {!USE_MOCK && <ConsentBanner />}
    </div>
  );
}
