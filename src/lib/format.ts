// ₹12.35 L / ₹1.2 Cr / ₹45.6 K for cards on narrow screens; the full figure goes in the title attribute
export const formatCompactINR = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const trim = (v: number, digits: number) => Number(v.toFixed(digits)).toString();
  if (abs >= 1e7) {
    const cr = abs / 1e7;
    // Fewer decimals as crores grow, so the figure stays short on a card
    return `${sign}₹${trim(cr, cr >= 1000 ? 0 : cr >= 100 ? 1 : 2)} Cr`;
  }
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5, 2)} L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3, 1)} K`;
  return `${sign}₹${Math.round(abs)}`;
};

export const formatINR = (n: number, fractionDigits = 0) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;

// 5000 → 5K, 2500000 → 2.5M, 5000000000 → 5B for unit counts on narrow cards.
// K/M/B rather than lakh/crore: "L" would read as litres next to stock quantities.
export const formatCompactNumber = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const trim = (v: number) => Number(v.toFixed(v >= 100 ? 0 : 1)).toString();
  if (abs >= 1e9) return `${sign}${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${trim(abs / 1e6)}M`;
  if (abs >= 1e4) return `${sign}${trim(abs / 1e3)}K`;
  return `${sign}${Number(abs.toFixed(1))}`;
};
