// Firebase Client Configuration & Google Authentication Adapter
// Supports live Firebase credentials via Vite env vars (VITE_FIREBASE_*)
// with seamless fallback so the application never breaks even without keys.

let firebaseApp = null;
let firebaseAuth = null;
let googleAuthProvider = null;

export async function getFirebaseServices() {
  if (firebaseAuth) {
    return { auth: firebaseAuth, googleProvider: googleAuthProvider };
  }

  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { getAuth, GoogleAuthProvider } = await import("firebase/auth");

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
    };

    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      firebaseAuth = getAuth(firebaseApp);
      googleAuthProvider = new GoogleAuthProvider();
      googleAuthProvider.setCustomParameters({ prompt: "select_account" });
      return { auth: firebaseAuth, googleProvider: googleAuthProvider };
    }
  } catch (err) {
    console.warn("Firebase SDK dynamic load skipped/unavailable:", err?.message);
  }

  return { auth: null, googleProvider: null };
}

/**
 * Sign In with Google popup.
 * If Firebase is configured, launches the live Google Auth popup.
 * If Firebase is not configured, provides an interactive prompt for seamless zero-setup testing.
 */
export async function signInWithFirebaseGoogle() {
  const { auth, googleProvider } = await getFirebaseServices();

  if (auth && googleProvider) {
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const result = await signInWithPopup(auth, googleProvider);
      return result?.user || null;
    } catch (popupErr) {
      console.error("Firebase Google Auth popup error:", popupErr);
      throw popupErr;
    }
  }

  // Graceful fallback for local development before Firebase keys are entered
  return null;
}
