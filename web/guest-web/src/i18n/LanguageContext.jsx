import { createContext, useContext, useEffect, useState } from 'react';
import { translations } from './translations.js';

const KEY = 'saigon.guest.ui-language';
const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'vi'; } catch { return 'vi'; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem(KEY, language); } catch { /* Storage may be disabled. */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
