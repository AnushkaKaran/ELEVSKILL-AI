import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirebaseAuth } from '../config/firebase.js';

export const GUEST_OWNER_ID = 'guest';

export function normalizeFirebaseUser(firebaseUser) {
  if (!firebaseUser || !firebaseUser.uid) return null;
  const displayName = (firebaseUser.displayName || '').trim();
  const email = (firebaseUser.email || '').trim();
  const fallbackName = email ? email.split('@')[0] : 'ELEVSKILL User';
  const resolvedName = displayName || fallbackName;

  return {
    uid: firebaseUser.uid,
    email,
    displayName: resolvedName,
    fullName: resolvedName,
    name: resolvedName,
    emailVerified: Boolean(firebaseUser.emailVerified),
    provider: 'firebase',
  };
}

export function getAuthSessionState(user) {
  const normalized = user?.uid ? user : null;
  const isAuthenticated = Boolean(normalized);
  return {
    isAuthenticated,
    isGuest: !isAuthenticated,
    user: normalized,
    ownerId: isAuthenticated ? normalized.uid : GUEST_OWNER_ID,
  };
}

export function formatFirebaseAuthError(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Email/Password sign-in is not enabled in Firebase Console yet.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase Authentication. Please check your connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

export async function registerWithEmail({ fullName, email, password }) {
  const auth = getFirebaseAuth();
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const trimmedName = (fullName || '').trim();
    if (trimmedName) {
      await updateProfile(credential.user, { displayName: trimmedName });
    }
    return normalizeFirebaseUser({
      ...credential.user,
      displayName: trimmedName || credential.user.displayName,
    });
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function loginWithEmail({ email, password }) {
  const auth = getFirebaseAuth();
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return normalizeFirebaseUser(credential.user);
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function logoutFirebase() {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch {
    // Ignore sign-out errors if Firebase config is absent
  }
}

export async function sendPasswordReset(email) {
  const auth = getFirebaseAuth();
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export function subscribeToAuthChanges(onChange) {
  try {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (firebaseUser) => {
      onChange(normalizeFirebaseUser(firebaseUser));
    });
  } catch {
    onChange(null);
    return () => {};
  }
}
