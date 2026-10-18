// A screen's strings: English, plus Hindi with exactly the same keys (tsc flags a missing or extra key)
export const defineStrings = <K extends string>(en: Record<K, string>, hi: Record<K, string>) => ({ en, hi });
