import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  const apps = getApps();

  if (!apps.length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace newlines in the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }

  const rawAuth = getAuth();
  const db = getFirestore();

  // Safe wrappers for common admin auth methods to avoid uncaught errors
  const safeAuth = {
    // Keep a reference to the raw auth object for other methods
    raw: rawAuth,
    async getUserByEmail(email: string) {
      try {
        return await rawAuth.getUserByEmail(email as any);
      } catch (err: any) {
        // Return null when user is not found instead of throwing
        if (err?.code === "auth/user-not-found" || err?.codePrefix === "auth") {
          return null;
        }
        throw err;
      }
    },
    async getUser(uid: string) {
      try {
        return await rawAuth.getUser(uid as any);
      } catch (err: any) {
        if (err?.code === "auth/user-not-found" || err?.codePrefix === "auth") {
          return null;
        }
        throw err;
      }
    },
    async createSessionCookie(idToken: string, options: any) {
      return await rawAuth.createSessionCookie(idToken, options);
    },
    async verifySessionCookie(cookie: string, checkRevoked?: boolean) {
      return await rawAuth.verifySessionCookie(cookie, checkRevoked as any);
    },
  } as any;

  return {
    auth: safeAuth,
    db,
  };
}

export const { auth, db } = initFirebaseAdmin();
