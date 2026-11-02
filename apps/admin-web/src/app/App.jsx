import React, { useState } from 'react';
import Admin from '../features/admin/auth/Admin.jsx';
import { messages } from './translations.js';

export default function App() {
  const [language, setLanguage] = useState('vi');
  const t = messages[language];
  return <>
    <header>
      <div className="container topbar">
        <div className="brand">SAIGON <span>STORIES</span><small>QUẬN 1 · VIỆT NAM</small></div>
        <nav aria-label={t.admin}>
          <span>{t.admin}</span>
          <label className="sr-only" htmlFor="language">{t.uiLanguage}</label>
          <select id="language" value={language} onChange={e => { setLanguage(e.target.value); document.documentElement.lang = e.target.value; }}>
            <option value="vi">VI</option><option value="en">EN</option>
          </select>
        </nav>
      </div>
    </header>
    <Admin t={t} />
    <footer><div className="container">SAIGON STORIES <span>·</span> QUẬN 1</div></footer>
  </>;
}
