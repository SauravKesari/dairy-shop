import { Settings } from '../types';

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
