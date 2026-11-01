import { NavLink, Outlet, Link } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Khám phá', end: true },
  { to: '/map', label: 'Bản đồ' },
  { to: '/privacy', label: 'Quyền riêng tư' },
];

export default function AppLayout() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">Saigon Stories <span>Quận 1</span></Link>
        <nav aria-label="Điều hướng chính" className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="content"><Outlet /></main>
      {/* Chỗ đặt banner đồng ý thống kê (UC12 – WBS-08) */}
      <div id="consent-slot" />
    </div>
  );
}
