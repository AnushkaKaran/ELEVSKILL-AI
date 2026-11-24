import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { app: {} };
const mockCreateUser = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockSendReset = vi.fn();
const mockUpdateProfile = vi.fn();
const mockOnAuthStateChanged = vi.fn();

vi.mock('../src/config/firebase.js', () => ({
  getFirebaseAuth: () => mockAuth,
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args) => mockSignIn(...args),
  signOut: (...args) => mockSignOut(...args),
  sendPasswordResetEmail: (...args) => mockSendReset(...args),
  updateProfile: (...args) => mockUpdateProfile(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}));

import {
  GUEST_OWNER_ID,
  formatFirebaseAuthError,
  getAuthSessionState,
  loginWithEmail,
  logoutFirebase,
  registerWithEmail,
  sendPasswordReset,
  subscribeToAuthChanges,
} from '../src/services/firebaseAuthService.js';

describe('firebaseAuthService (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes auth session state and ownerId for guest and authenticated users', () => {
    expect(getAuthSessionState(null)).toEqual({
      isAuthenticated: false,
      isGuest: true,
      user: null,
      ownerId: GUEST_OWNER_ID,
    });

    const user = { uid: 'fb-uid-999', email: 'alex@example.com', displayName: 'Alex' };
    expect(getAuthSessionState(user)).toEqual({
      isAuthenticated: true,
      isGuest: false,
      user,
      ownerId: 'fb-uid-999',
    });
  });

  it('registers a user with email/password and sets displayName', async () => {
    const fbUser = { uid: 'uid-1', email: 'new@example.com', displayName: null, emailVerified: false };
    mockCreateUser.mockResolvedValue({ user: fbUser });
    mockUpdateProfile.mockResolvedValue();

    const user = await registerWithEmail({
      fullName: 'Priya Sharma',
      email: 'new@example.com',
      password: 'Password123!',
    });

    expect(mockCreateUser).toHaveBeenCalledWith(mockAuth, 'new@example.com', 'Password123!');
    expect(mockUpdateProfile).toHaveBeenCalledWith(fbUser, { displayName: 'Priya Sharma' });
    expect(user.uid).toBe('uid-1');
    expect(user.fullName).toBe('Priya Sharma');
    expect(user.provider).toBe('firebase');
  });

  it('logs in, sends password reset email, and logs out via Firebase Auth', async () => {
    mockSignIn.mockResolvedValue({
      user: { uid: 'uid-2', email: 'user@example.com', displayName: 'User Two', emailVerified: true },
    });
    const loggedIn = await loginWithEmail({ email: 'user@example.com', password: 'Password123!' });
    expect(loggedIn.uid).toBe('uid-2');
    expect(loggedIn.emailVerified).toBe(true);

    mockSendReset.mockResolvedValue();
    await sendPasswordReset('user@example.com');
    expect(mockSendReset).toHaveBeenCalledWith(mockAuth, 'user@example.com');

    mockSignOut.mockResolvedValue();
    await logoutFirebase();
    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
  });

  it('subscribes to onAuthStateChanged and normalizes null/user callbacks', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: 'uid-3', email: 'persist@example.com', displayName: 'Persist', emailVerified: false });
      cb(null);
      return unsubscribe;
    });

    const events = [];
    const unsub = subscribeToAuthChanges((u) => events.push(u));
    expect(events).toHaveLength(2);
    expect(events[0].uid).toBe('uid-3');
    expect(events[1]).toBeNull();
    unsub();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('maps Firebase Auth error codes to safe user-friendly messages', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    await expect(loginWithEmail({ email: 'bad@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password. Please try again.'
    );

    expect(formatFirebaseAuthError({ code: 'auth/operation-not-allowed' })).toContain(
      'Email/Password sign-in is not enabled in Firebase Console yet.'
    );
    expect(formatFirebaseAuthError({ code: 'auth/email-already-in-use' })).toContain(
      'already exists'
    );
  });
});
