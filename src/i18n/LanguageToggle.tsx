import React from 'react';
import { useLanguage } from './LanguageContext';

export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang, t } = useLanguage();
  const side = (active: boolean) =>
    `px-2 py-0.5 rounded-full transition-colors ${active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`;

  return (
    <div
      role="group"
      aria-label={t('lang.switchTo')}
      title={t('lang.switchTo')}
      className={`no-print inline-flex items-center gap-0.5 p-0.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold shrink-0 ${className}`}
    >
      <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={side(lang === 'en')}>
        EN
      </button>
      <button type="button" lang="hi" aria-pressed={lang === 'hi'} onClick={() => setLang('hi')} className={side(lang === 'hi')}>
        हि
      </button>
    </div>
  );
};
