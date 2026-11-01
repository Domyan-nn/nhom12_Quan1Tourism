import React, { useState } from 'react';
import Places from '../features/places/Places.jsx';
import Admin from '../features/admin/auth/Admin.jsx';
import { messages } from './translations.js';

export default function App() {
  const [language, setLanguage] = useState('vi');
  const [page, setPage] = useState('guest');
  const t = messages[language];
  return <><header><div className="container topbar"><button className="brand" onClick={() => setPage('guest')}>SAIGON <span>STORIES</span><small>QUẬN 1 · VIỆT NAM</small></button><nav aria-label="Main"><button className={page === 'guest' ? 'active' : ''} onClick={() => setPage('guest')}>{t.explore}</button><button className={page === 'admin' ? 'active' : ''} onClick={() => setPage('admin')}>{t.admin}</button><label className="sr-only" htmlFor="language">{t.uiLanguage}</label><select id="language" value={language} onChange={e => { setLanguage(e.target.value); document.documentElement.lang = e.target.value; }}><option value="vi">VI</option><option value="en">EN</option></select></nav></div></header><div hidden={page !== 'guest'}><Places t={t} /></div><div hidden={page !== 'admin'}><Admin t={t} /></div><footer><div className="container">SAIGON STORIES <span>·</span> QUẬN 1</div></footer></>;
}
