import React, { useEffect, useState } from 'react';
import { request } from '../../../services/api.js';
import Categories from '../categories/Categories.jsx';
import Places from '../places/Places.jsx';

export default function Admin({ t, language }) {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const expire = () => { setSession(null); setError('AUTH_REQUIRED'); };
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(expire, Math.max(0, new Date(session.expires_at).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await request('/admin/login', { method: 'POST', body: { username, password } }); setSession(result); setPassword(''); }
    catch (err) { setError(err.code || 'SERVER_ERROR'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await request('/admin/logout', { method: 'POST', token: session.access_token }); setSession(null); }
    catch (err) { if (err.status === 401) expire(); else setError(err.code || 'SERVER_ERROR'); }
    finally { setBusy(false); }
  }
  const errorMessage = error === 'AUTH_REQUIRED' ? t.sessionExpired : (t[error] || t.SERVER_ERROR);
  return <main className="container admin-page">{!session ? <section className="panel login"><p className="eyebrow">SAIGON STORIES</p><h1>{t.login}</h1><form onSubmit={login}><label>{t.username}<input autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} /></label><label>{t.password}<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="error">{errorMessage}</p>}<button disabled={busy}>{busy ? t.signing : t.signIn}</button></form></section> : <section><div className="admin-heading"><div><p className="eyebrow">{t.signedIn} · {username}</p><h1>{t.admin}</h1></div><button className="secondary" onClick={logout} disabled={busy}>{t.logout}</button></div>{error && <p role="alert" className="error">{errorMessage}</p>}<h2>{t.categories}</h2><Categories t={t} token={session.access_token} onExpired={expire} /><Places t={t} language={language} token={session.access_token} onExpired={expire} /></section>}</main>;
}
