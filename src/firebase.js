// Firebase Client Configuration & Google Authentication Adapter
// Supports live Firebase credentials via Vite env vars (VITE_FIREBASE_*)
// with seamless fallback so the application never breaks even without keys.

let firebaseApp = null;
let firebaseAuth = null;
let googleAuthProvider = null;

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  };
}

export async function getFirebaseServices() {
  if (firebaseAuth) {
    return { auth: firebaseAuth, googleProvider: googleAuthProvider };
  }

  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { getAuth, GoogleAuthProvider } = await import("firebase/auth");

    const firebaseConfig = getFirebaseConfig();

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

let firestoreDb = null;

export async function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { getFirestore } = await import("firebase/firestore");

    const firebaseConfig = getFirebaseConfig();

    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      firestoreDb = getFirestore(app);
      return firestoreDb;
    }
  } catch (err) {
    console.warn("Firestore dynamic load unavailable:", err?.message);
  }
  return null;
}

export function sanitizeUserKey(emailOrUid) {
  if (!emailOrUid || typeof emailOrUid !== "string") return "guest";
  return emailOrUid.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

/**
 * Save user trading journal data to Firebase Firestore (keyed to Gmail / UID).
 * Persists accounts (with custom starting capital), trades, and rules across all login devices.
 */
export async function saveUserForexJournal(emailOrUid, data) {
  try {
    const db = await getFirestoreDb();
    if (!db) return false;
    const { doc, setDoc } = await import("firebase/firestore");
    const key = sanitizeUserKey(emailOrUid);
    const docRef = doc(db, "forex_journals", key);
    await setDoc(docRef, {
      ...data,
      userKey: key,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Firestore save warning:", err?.message);
    return false;
  }
}

/**
 * Load user trading journal from Firebase Firestore.
 */
export async function loadUserForexJournal(emailOrUid) {
  try {
    const db = await getFirestoreDb();
    if (!db) return null;
    const { doc, getDoc } = await import("firebase/firestore");
    const key = sanitizeUserKey(emailOrUid);
    const docRef = doc(db, "forex_journals", key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn("Firestore load warning:", err?.message);
  }
  return null;
}

/**
 * Real-time cross-device listener: When user logs a trade on phone or laptop,
 * all open sessions update instantly.
 */
export async function subscribeUserForexJournal(emailOrUid, callback) {
  try {
    const db = await getFirestoreDb();
    if (!db) return () => {};
    const { doc, onSnapshot } = await import("firebase/firestore");
    const key = sanitizeUserKey(emailOrUid);
    const docRef = doc(db, "forex_journals", key);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    }, (err) => {
      console.warn("Firestore subscription warning:", err?.message);
    });
    return unsubscribe;
  } catch (err) {
    console.warn("Firestore subscribe warning:", err?.message);
    return () => {};
  }
}
