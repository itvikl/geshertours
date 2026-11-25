"use client";

/**
 * Firebase CLIENT SDK — safe to bundle to the browser.
 * Used for: auth sign-in/sign-up UI, and optional real-time listeners
 * (e.g. live seat counts). Never used for privileged reads/writes —
 * that's lib/firebase/admin.ts, server-only.
 */
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Local testing only: NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST (e.g.
// "127.0.0.1:9099") points sign-in at the Firebase Auth emulator. Never set
// in production, where this does nothing.
const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
if (authEmulatorHost && !(auth as { emulatorConfig?: unknown }).emulatorConfig) {
  connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
}
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
