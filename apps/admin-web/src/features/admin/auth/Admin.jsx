import React, { useCallback, useEffect, useState } from 'react';
import { request } from '../../../services/api.js';
import { clearSession, loadSession, saveSession } from '../../../services/session.js';
import Categories from '../categories/Categories.jsx';
import Places from '../places/Places.jsx';
import Dashboard from '../analytics/Dashboard.jsx';
import AuditLog from '../audit/AuditLog.jsx';

const TABS = ['dashboard', 'categories', 'places', 'audit'];
const tabFromHash = () => {
  const value = window.location.hash.replace('#', '');
  return TABS.includes(value) ? value : 'dashboard';
};

export default function Admin({ t, language }) {
  const [tab, setTab] = useState(tabFromHash);
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(() => loadSession() !== null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const expire = useCallback(() => { clearSession(); setSession(null); setError('AUTH_REQUIRED'); }, []);

  // UC05 bước 2 / A1: còn phiên hợp lệ trong tab này thì vào thẳng trang quản trị.
  useEffect(() => {
    const stored = loadSession();
    if (!stored) return undefined;
    let active = true;
    request('/admin/me', { token: stored.access_token })
      .then((me) => { if (active) setSession({ ...stored, username: me.username }); })
      .catch((err) => {
        if (!active) return;
        // 401: phiên hết hạn/bị thu hồi. Lỗi khác: giữ bản lưu để lần tải sau thử lại.
        if (err.status === 401) { clearSession(); setError('AUTH_REQUIRED'); }
        else setError(err.code || 'SERVER_ERROR');
      })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  // Tab lưu trên URL (#categories...) để tải lại trang vẫn ở đúng chỗ; Back/Forward cũng đổi tab.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  function openTab(next) {
    setTab(next);
    if (window.location.hash !== `#${next}`) window.history.replaceState(null, '', `#${next}`);
  }

  useEffect(() => {
    if (!session) return undefined;
    const timer = setTimeout(expire, Math.max(0, new Date(session.expires_at).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [session, expire]);

  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await request('/admin/login', { method: 'POST', body: { username, password } });
      const next = { ...result, username: username.trim() };
      saveSession(next);
      setSession(next);
      setPassword('');
    } catch (err) { setError(err.code || 'SERVER_ERROR'); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try {
      await request('/admin/logout', { method: 'POST', token: session.access_token });
      clearSession();
      setSession(null);
    } catch (err) { if (err.status === 401) expire(); else setError(err.code || 'SERVER_ERROR'); }
    finally { setBusy(false); }
  }

  const errorMessage = error === 'AUTH_REQUIRED' ? t.sessionExpired : (t[error] || t.SERVER_ERROR);

  if (restoring) return <main className="container admin-page"><p role="status">{t.loading}</p></main>;

  if (!session) {
    return <main className="container admin-page">
      <section className="panel login">
        <p className="eyebrow">SAIGON STORIES</p>
        <h1>{t.login}</h1>
        <form onSubmit={login}>
          <label>{t.username}<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
          <label>{t.password}<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p role="alert" className="error">{errorMessage}</p>}
          <button disabled={busy}>{busy ? t.signing : t.signIn}</button>
        </form>
      </section>
    </main>;
  }

  const token = session.access_token;
  return <main className="container admin-page">
    <section>
      <div className="admin-heading">
        <div><p className="eyebrow">{t.signedIn} · {session.username}</p><h1>{t.admin}</h1></div>
        <button className="secondary" onClick={logout} disabled={busy}>{t.logout}</button>
      </div>
      {error && <p role="alert" className="error">{errorMessage}</p>}
      <div className="admin-tabs" role="tablist" aria-label={t.admin}>
        {TABS.map((name) => <button key={name} type="button" role="tab" id={`tab-${name}`} aria-controls={`panel-${name}`}
          aria-selected={tab === name} className={tab === name ? 'active' : ''} onClick={() => openTab(name)}>{t[`tab_${name}`]}</button>)}
      </div>
      {/* Chỉ panel đang mở được dựng: Dashboard chỉ tự làm mới khi đang hiển thị (BR17). */}
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'dashboard' && <Dashboard language={language} token={token} onExpired={expire} />}
        {tab === 'categories' && <><h2>{t.categories}</h2><Categories t={t} token={token} onExpired={expire} /></>}
        {tab === 'places' && <Places t={t} language={language} token={token} onExpired={expire} />}
        {tab === 'audit' && <AuditLog language={language} token={token} onExpired={expire} />}
      </div>
    </section>
  </main>;
}
