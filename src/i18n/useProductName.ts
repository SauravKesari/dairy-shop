import { useCallback, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { Product } from '../types';
import { useLanguage } from './LanguageContext';

// Product names follow the language toggle. Bills, purchases and stock movements store an English
// snapshot (product_name), so nameOf looks the product up by id for its Hindi name, falling back to the snapshot.
export const useProductName = () => {
  const { products } = useDairy();
  const { lang, tx } = useLanguage();

  const hindiById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.name_hi?.trim()) map.set(p.id, p.name_hi.trim());
    });
    return map;
  }, [products]);

  const productLabel = useCallback(
    (p: Pick<Product, 'name' | 'name_hi'>) => (lang === 'hi' && p.name_hi?.trim()) || p.name,
    [lang]
  );

  const nameOf = useCallback(
    (productId: string, storedName: string) => (lang === 'hi' && hindiById.get(productId)) || storedName,
    [lang, hindiById]
  );

  // Units are stored as short codes (pkt, pouch, ...); unknown custom units show as typed
  const unitOf = useCallback((unit: string) => tx(`unit.${unit}`, unit), [tx]);

  // Search matches the English or the Hindi name
  const matchesName = useCallback(
    (p: Pick<Product, 'name' | 'name_hi'>, query: string) => {
      const q = query.trim().toLowerCase();
      return !q || p.name.toLowerCase().includes(q) || Boolean(p.name_hi?.toLowerCase().includes(q));
    },
    []
  );

  return { productLabel, nameOf, unitOf, matchesName };
};
