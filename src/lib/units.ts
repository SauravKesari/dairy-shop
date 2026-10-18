import { Settings } from '../types';
import { translate, translateDynamic } from '../i18n';

// Built-in units; the owner can add more, which are stored in settings.custom_units
export const DEFAULT_UNITS: { unit: string; label: string }[] = [
  { unit: 'L', label: 'Litre' },
  { unit: 'kg', label: 'Kilogram' },
  { unit: 'pkt', label: 'Packet' },
  { unit: 'cup', label: 'Cup' },
  { unit: 'bottle', label: 'Bottle' },
  { unit: 'piece', label: 'Piece' },
  { unit: '500ml', label: '500 ml pack' },
];

// Built-in units first, then custom ones; `extra` keeps a product's own unit listed (e.g. from a CSV import)
export const allUnits = (settings: Pick<Settings, 'custom_units'>, extra?: string): string[] => {
  const list = [...DEFAULT_UNITS.map(u => u.unit), ...(settings.custom_units || [])];
  if (extra && !list.some(u => u.toLowerCase() === extra.toLowerCase())) list.push(extra);
  return list;
};

export const unitLabel = (unit: string) => DEFAULT_UNITS.find(u => u.unit === unit)?.label;

// Loose milk / paneer is sold by weight or volume; every other unit is a countable pack (whole numbers only)
export const isLooseUnit = (unit: string) => unit === 'L' || unit === 'kg';

// For <input type="number">: browsers count spinner steps from `min`, so min must be a multiple of step
export const qtyStep = (unit: string) => (isLooseUnit(unit) ? '0.001' : '1');

// Reads a typed quantity: up to 3 decimals for loose L / kg, whole numbers for packs
export const parseQty = (raw: string, unit: string) => {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return isLooseUnit(unit) ? Number(n.toFixed(3)) : Math.round(n);
};

export const isValidQtyForUnit = (qty: number, unit: string) => isLooseUnit(unit) || Number.isInteger(qty);

export const wholeQtyError = (name: string, unit: string, qty: number) =>
  translate('err.wholeQty', { name, unit: translateDynamic(`unit.${unit}`, unit), qty });
