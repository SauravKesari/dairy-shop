import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Lang, TKey, Vars, setCurrentLang, translateDynamicIn, translateIn } from './index';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
  // Runtime-built keys such as `payment.${method}`; falls back to `fallback` (usually the raw value)
  tx: (key: string, fallback: string, vars?: Vars) => string;
}

const STORAGE_KEY = 'lang';

const readStoredLang = (): Lang => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Sits outside DairyProvider so the login screen can switch language too; the choice is per device
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = readStoredLang();
    setCurrentLang(stored);
    return stored;
  });

  const setLang = useCallback((next: Lang) => {
    setCurrentLang(next);
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice lasts until reload
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextType>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translateIn(lang, key, vars),
      tx: (key, fallback, vars) => translateDynamicIn(lang, key, fallback, vars),
    }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
