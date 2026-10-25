import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProductName } from '../../i18n/useProductName';

// Spells out the short unit codes (P = Pouch...) used in the stock tables; only units that are on screen,
// and none whose code already reads as the full name (L, kg)
export const UnitLegend: React.FC<{ units: string[] }> = ({ units }) => {
  const { t } = useLanguage();
  const { unitOf, unitShortOf } = useProductName();

  const plain = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const entries = Array.from(new Set(units))
    .filter(u => plain(unitShortOf(u)) !== plain(unitOf(u)))
    .sort((a, b) => unitShortOf(a).localeCompare(unitShortOf(b)));
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-slate-500">
      <span className="font-semibold text-slate-600">{t('stock.unitLegend')}:</span>
      {entries.map(u => (
        <span key={u} className="whitespace-nowrap">
          <span className="font-mono-numbers font-semibold text-slate-700">{unitShortOf(u)}</span> = <span className="capitalize">{unitOf(u)}</span>
        </span>
      ))}
    </div>
  );
};
