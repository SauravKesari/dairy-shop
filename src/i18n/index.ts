import common from './strings/common';
import nav from './strings/nav';
import login from './strings/login';
import app from './strings/app';
import pos from './strings/pos';
import receipt from './strings/receipt';
import sales from './strings/sales';
import stock from './strings/stock';
import purchases from './strings/purchases';
import credit from './strings/credit';
import expenses from './strings/expenses';
import closing from './strings/closing';
import reports from './strings/reports';
import profit from './strings/profit';
import products from './strings/products';
import categories from './strings/categories';
import settings from './strings/settings';
import users from './strings/users';
import audit from './strings/audit';
import errors from './strings/errors';

export type Lang = 'en' | 'hi';

// One module per screen so screens can be translated independently; keys are prefixed by screen
export const en = {
  ...common.en, ...nav.en, ...login.en, ...app.en, ...pos.en, ...receipt.en, ...sales.en, ...stock.en,
  ...purchases.en, ...credit.en, ...expenses.en, ...closing.en, ...reports.en, ...profit.en,
  ...products.en, ...categories.en, ...settings.en, ...users.en, ...audit.en, ...errors.en,
};

export type TKey = keyof typeof en;

export const hi: Record<TKey, string> = {
  ...common.hi, ...nav.hi, ...login.hi, ...app.hi, ...pos.hi, ...receipt.hi, ...sales.hi, ...stock.hi,
  ...purchases.hi, ...credit.hi, ...expenses.hi, ...closing.hi, ...reports.hi, ...profit.hi,
  ...products.hi, ...categories.hi, ...settings.hi, ...users.hi, ...audit.hi, ...errors.hi,
};

export type Vars = Record<string, string | number>;

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;

export const translateIn = (lang: Lang, key: TKey, vars?: Vars) => fill((lang === 'hi' && hi[key]) || en[key] || key, vars);

// For keys built at runtime (e.g. `payment.${method}`); unknown keys return the fallback
export const translateDynamicIn = (lang: Lang, key: string, fallback: string, vars?: Vars) => {
  const text = (lang === 'hi' && (hi as Record<string, string>)[key]) || (en as Record<string, string>)[key];
  return fill(text ?? fallback, vars);
};

// Module-level copy of the current language for code outside React (DairyContext results, firebase errors)
let currentLang: Lang = 'en';
export const setCurrentLang = (lang: Lang) => {
  currentLang = lang;
};
export const getCurrentLang = () => currentLang;
export const translate = (key: TKey, vars?: Vars) => translateIn(currentLang, key, vars);
export const translateDynamic = (key: string, fallback: string, vars?: Vars) =>
  translateDynamicIn(currentLang, key, fallback, vars);
