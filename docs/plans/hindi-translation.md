# English ↔ Hindi language toggle

## Context
Counter staff are more comfortable reading Hindi. You want an EN/हि toggle in the Navbar that anyone can switch. The choice is remembered per device, and printed receipts follow the selected language. The app has no i18n today: about 600–900 hardcoded English strings across 18 components, plus error messages in `DairyContext.tsx` and `lib/firebase.ts`. The translation approach is a built-in dictionary, with no library and no network calls.

**Out of scope:** user data stored in Firestore stays as typed. That covers product, customer, supplier and staff names, shop name and address, receipt footer, and notes. Users can type these in Hindi if they want.

## Approach

### 1. Translation core (new files)
- `src/i18n/en.ts`: a flat dictionary keyed by screen, e.g. `'nav.pos': 'Billing'` and `'pos.checkout': 'Checkout'`. Export `type TKey = keyof typeof en`.
- `src/i18n/hi.ts`: `Record<TKey, string>`. TypeScript then flags any missing Hindi key at `npm run lint`.
- `src/i18n/LanguageContext.tsx`:
  - `LanguageProvider` holds `lang: 'en' | 'hi'`. It's initialised from `localStorage['lang']`, wrapped in try/catch and defaulting to `'en'`.
  - It exposes `{ lang, setLang, t }` through a `useLanguage()` hook.
  - `t(key, vars?)` falls back to English and does simple `{name}` interpolation.
  - It sets `document.documentElement.lang` on change.
- **Enum labels:** add keys such as `'payment.cash'`, `'unit.litre'`, `'role.cashier'` and `'expense.category.*'`. Replace raw renders like `payment_method.toUpperCase()` with `t(\`payment.${m}\`)`.

### 2. Wire the provider
- `src/App.tsx:75-81`: wrap `<DairyProvider>` in `<LanguageProvider>`. It must sit outside, because `LoginScreen` renders before `DairyContext` exists (`DairyContext.tsx:306`).

### 3. Toggle button
- **Component:** `src/i18n/LanguageToggle.tsx`, a small pill button showing `EN | हि` with the active side highlighted.
- **Navbar:** in `Navbar.tsx` Zone 3 (around line 297), between the business-date pill and the user menu. It's visible on mobile too.
- **Login screen:** also in the `LoginScreen.tsx` header row (lines 109–112, make it `justify-between`), so a cashier can switch before signing in.

### 4. Hindi font
- `index.html:13`: add `Noto Sans Devanagari` to the Google Fonts link.
- `src/index.css`: append it to the sans font stack. Without it, Hindi falls back to inconsistent system fonts, especially on the receipt.

### 5. Receipt (follows app language)
- `src/components/pos/ReceiptModal.tsx`: replace the labels with `t()`. That's Invoice, Date, Cashier, Subtotal, Discount, Total, Payment and the item table headers.
- Translate the WhatsApp share template text (lines 56–71) as well.
- Keep amounts as `₹` with Western digits for readability and printer safety.

### 6. Convert screens (pattern: `const { t } = useLanguage();`, then replace literals with `t('screen.key')`)
Work in priority order, so the counter staff benefit first:
1. Navbar, LoginScreen, POSScreen, ReceiptModal
2. SalesHistory, CreditScreen, ExpensesScreen, DailyClosingScreen, StockScreen, PurchasesScreen
3. Owner screens: ProductsCatalog, Reports, Settings, Users, AuditLog, App.tsx footer and access text
4. Error messages: `DairyContext.tsx` (about 38 `error:` strings) and `friendlyFirebaseError` in `src/lib/firebase.ts`. These run outside React hooks, so they need a plain `translate(key)` exported from `LanguageContext.tsx` that reads the current language from a module-level variable kept in sync by the provider.
5. Leave GoLiveChecklist and DeployScreen in English. They're setup and developer screens with long technical text.

Alerts in components, such as `ExpensesScreen.tsx:69`, use `t()` too.

## Critical files
- **New:** `src/i18n/en.ts`, `src/i18n/hi.ts`, `src/i18n/LanguageContext.tsx`, `src/i18n/LanguageToggle.tsx`
- **Modified:** `src/App.tsx`, `src/components/Navbar.tsx`, `src/components/auth/LoginScreen.tsx`, `src/components/pos/ReceiptModal.tsx`, `index.html`, `src/index.css`, then the screens listed in step 6

## Verification
1. `npm run lint` passes. Type checking catches any missing Hindi keys.
2. `npm run dev`, open http://localhost:3000:
   - Toggle on the login screen, then sign in. The language persists after login and after a page refresh.
   - Switch in the Navbar and check that tabs, the POS screen, buttons and errors change. A good error to test is a cashier discount above the limit.
   - Make a sale, open the receipt in Hindi, print preview, and confirm it's still a single page (the recent fix in #4) with Devanagari rendering in Noto Sans.
   - Try mobile width: the toggle shouldn't crowd the shop name. This regressed once before (#3).
3. Have a native Hindi speaker in the shop review `hi.ts` wording, e.g. "उधार" vs "क्रेडिट".
