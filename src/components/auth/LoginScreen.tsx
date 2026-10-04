import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { LogIn, Store, AlertCircle, Loader2 } from 'lucide-react';
import { auth, db, mobileToEmail, friendlyFirebaseError, MIN_PIN_LENGTH } from '../../lib/firebase';
import { initialSettings } from '../../data/initialData';

export type AuthStatus = 'loading' | 'signed_out' | 'no_profile' | 'inactive';

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800';

// Kept mounted across auth changes, so first-time setup can finish writing the owner profile
export const LoginScreen: React.FC<{ status: AuthStatus }> = ({ status }) => {
  const [isSetupDone, setIsSetupDone] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'meta', 'bootstrap'))
      .then(snap => {
        setIsSetupDone(snap.exists());
        if (!snap.exists()) setMode('setup');
      })
      .catch(() => setIsSetupDone(true));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, mobileToEmail(mobile), pin);
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setBusy(false);
    }
  };

  // Creates the first owner login, owner profile, shop settings and the bootstrap marker in one batch
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length < MIN_PIN_LENGTH) {
      setError(`PIN must be at least ${MIN_PIN_LENGTH} digits.`);
      return;
    }
    setBusy(true);
    try {
      const email = mobileToEmail(mobile);
      let uid: string;
      try {
        uid = (await createUserWithEmailAndPassword(auth, email, pin)).user.uid;
      } catch (err: any) {
        // A previous setup attempt created the login but failed to save the profile
        if (err?.code !== 'auth/email-already-in-use') throw err;
        uid = (await signInWithEmailAndPassword(auth, email, pin)).user.uid;
      }
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), {
        id: uid,
        name: ownerName.trim(),
        mobile: mobile.trim(),
        role: 'owner',
        active: true,
        created_at: now,
      });
      batch.set(doc(db, 'settings', 'shop'), {
        ...initialSettings,
        shop_name: shopName.trim(),
        address: '',
        phone: mobile.trim(),
        upi_id: '',
        receipt_footer: `Thank you for visiting ${shopName.trim()}!`,
      });
      batch.set(doc(db, 'meta', 'bootstrap'), { owner_uid: uid, created_at: now });
      await batch.commit();
    } catch (err) {
      console.error(err);
      setError(friendlyFirebaseError(err));
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading' && !busy) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm text-slate-500 gap-2 font-sans">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  const signedInWithoutAccess = (status === 'no_profile' || status === 'inactive') && !busy;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full max-w-sm p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
            <Store className="w-5 h-5" />
            <span>Dairy Parlour</span>
          </h1>
          <p className="text-xs text-slate-500">
            {mode === 'setup' ? 'First-time setup: create the shop owner account' : 'Sign in with your mobile number and PIN'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {signedInWithoutAccess ? (
          <div className="space-y-3 text-xs">
            <p className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
              {status === 'inactive'
                ? 'This account has been deactivated. Ask the shop owner to re-activate it.'
                : 'This login has no staff profile in this shop. Ask the shop owner to add you from the Users screen.'}
            </p>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
            >
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={mode === 'setup' ? handleSetup : handleLogin} className="space-y-3 text-xs">
            {mode === 'setup' && (
              <>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Shop name *</label>
                  <input required value={shopName} onChange={e => setShopName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Owner name *</label>
                  <input required value={ownerName} onChange={e => setOwnerName(e.target.value)} className={inputClass} />
                </div>
              </>
            )}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mobile number *</label>
              <input
                required
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                PIN * {mode === 'setup' && <span className="font-normal text-slate-500">(at least {MIN_PIN_LENGTH} digits)</span>}
              </label>
              <input
                required
                type="password"
                inputMode="numeric"
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{mode === 'setup' ? 'Create owner account' : 'Sign in'}</span>
            </button>
            {isSetupDone === false && (
              <button
                type="button"
                onClick={() => setMode(mode === 'setup' ? 'login' : 'setup')}
                className="w-full text-center text-slate-500 hover:text-slate-900 underline"
              >
                {mode === 'setup' ? 'Already set up? Sign in' : 'First time? Set up the shop'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
