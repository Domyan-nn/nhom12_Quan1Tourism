import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations } from './translations';

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

/** Ngôn ngữ thuyết minh ưu tiên (UC03). Chỉ là lựa chọn; bài thiếu ngôn ngữ vẫn được báo rõ, không đổi ngầm. */
export function SettingsProvider({ children }) {
  const [locale, setLocale] = useState('vi');
  const [uiLanguage, setUiLanguage] = useState('vi');
  const value = useMemo(() => ({ locale, setLocale, uiLanguage, setUiLanguage, t: translations[uiLanguage] }), [locale, uiLanguage]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
