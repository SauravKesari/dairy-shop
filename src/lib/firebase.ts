import { initializeApp, getApp, getApps, FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signOut,
  connectAuthEmulator,
  Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore';

const env = import.meta.env;

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const useEmulator = env.VITE_USE_EMULATOR === 'true';

// Sales, stock movements and audit logs are loaded for this many days only (keeps reads in the free tier)
export const HISTORY_DAYS = Number(env.VITE_HISTORY_DAYS) || 90;

const AUTH_EMAIL_DOMAIN = env.VITE_AUTH_EMAIL_DOMAIN || 'dairyshop.local';

// Staff log in with mobile + PIN; Firebase Auth needs an email, so the mobile maps to a synthetic one
export const mobileToEmail = (mobile: string) =>
  `${mobile.replace(/\D/g, '')}@${AUTH_EMAIL_DOMAIN}`;

export const MIN_PIN_LENGTH = 6; // Firebase Auth minimum password length

let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth;
let db: Firestore;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    // Optional fields are often undefined in this app's objects; skip them instead of throwing
    ignoreUndefinedProperties: true,
    // Offline reads + queued writes (Section 1: billing must keep working on a flaky connection)
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export { auth, db };

// Creates a login for another staff member without signing the owner out,
// by using a separate Firebase app instance with in-memory auth.
export const createAuthUser = async (mobile: string, pin: string): Promise<string> => {
  const secondaryApp = getApps().find(a => a.name === 'user-admin') || initializeApp(firebaseConfig, 'user-admin');
  let secondaryAuth: Auth;
  try {
    secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
    if (useEmulator) connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  } catch {
    secondaryAuth = getAuth(secondaryApp); // already initialised on an earlier call
  }
  const cred = await createUserWithEmailAndPassword(secondaryAuth, mobileToEmail(mobile), pin);
  await signOut(secondaryAuth);
  return cred.user.uid;
};

// Maps Firebase error codes to messages a shop counter user can act on
export const friendlyFirebaseError = (err: any): string => {
  const code: string = err?.code || '';
  if (code === 'permission-denied') return 'Permission denied: your role is not allowed to do this, or the day is closed.';
  if (code === 'unavailable') return 'No internet connection. Please retry, or use the paper bill book and enter it later.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found')
    return 'Wrong mobile number or PIN.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.';
  if (code === 'auth/email-already-in-use') return 'A login already exists for this mobile number.';
  if (code === 'auth/weak-password') return `PIN must be at least ${MIN_PIN_LENGTH} digits.`;
  if (code === 'auth/requires-recent-login') return 'Please sign out and sign in again, then retry.';
  if (code === 'auth/network-request-failed') return 'No internet connection.';
  return err?.message || 'Something went wrong.';
};
