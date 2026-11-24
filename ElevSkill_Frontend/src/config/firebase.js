import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAI, GoogleAIBackend } from 'firebase/ai';
import { getAuth } from 'firebase/auth';

export class FirebaseConfigError extends Error {
  constructor(message, missingKeys = []) {
    super(message);
    this.name = 'FirebaseConfigError';
    this.missingKeys = missingKeys;
  }
}

function readFirebaseConfig() {
  return {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  };
}

export function getMissingFirebaseKeys() {
  const cfg = readFirebaseConfig();
  const keyMap = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'VITE_FIREBASE_APP_ID',
  };
  return Object.entries(keyMap)
    .filter(([prop]) => !cfg[prop])
    .map(([, envName]) => envName);
}

let cachedApp = null;
let cachedAppCheck = null;
let cachedAi = null;
let cachedAuth = null;

function ensureFirebaseApp() {
  const missing = getMissingFirebaseKeys();
  if (missing.length > 0) {
    throw new FirebaseConfigError(
      `Firebase is not configured yet. Add ${missing.join(', ')} to ElevSkill_Frontend/.env.local.`,
      missing
    );
  }

  if (!cachedApp) {
    const config = readFirebaseConfig();
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
  }
  return cachedApp;
}

export function getFirebaseAuth() {
  const app = ensureFirebaseApp();
  if (!cachedAuth) {
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

export function getFirebaseServices() {
  ensureFirebaseApp();

  if (!cachedAppCheck && typeof window !== 'undefined') {
    const siteKey = (import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY || '').trim();
    const isLocalDev =
      import.meta.env.DEV &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalDev) {
      const envDebugToken = (import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN || '').trim();
      // Only enable App Check debug mode in local development builds; never in production.
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = envDebugToken || true;

      // Official Web debug-token flow: ReCaptchaV3Provider is passed to initializeAppCheck,
      // while Firebase App Check debug mode intercepts token generation/exchange on localhost.
      cachedAppCheck = initializeAppCheck(cachedApp, {
        provider: new ReCaptchaV3Provider(siteKey || 'local-dev-debug-key'),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (siteKey) {
      cachedAppCheck = initializeAppCheck(cachedApp, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      throw new FirebaseConfigError(
        'VITE_FIREBASE_APP_CHECK_SITE_KEY is required for Firebase App Check in production.',
        ['VITE_FIREBASE_APP_CHECK_SITE_KEY']
      );
    }
  }

  if (!cachedAi) {
    cachedAi = getAI(cachedApp, { backend: new GoogleAIBackend() });
  }

  if (!cachedAuth) {
    cachedAuth = getAuth(cachedApp);
  }

  return {
    app: cachedApp,
    appCheck: cachedAppCheck,
    ai: cachedAi,
    auth: cachedAuth,
    appCheckConfigured: Boolean(cachedAppCheck),
  };
}
