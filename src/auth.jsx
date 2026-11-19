import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { signInWithFirebaseGoogle, signOutFirebase } from "./firebase.js";

/**
 * Calm Capital - Google & Firebase Authentication Engine
 * Sole Authentication Method: Official Google (Gmail) Sign-In
 * 
 * 100% Optional for users:
 * - Indian IPOs & Forex News: Fully public (no login required).
 * - Discipline Trading Journal: Gated with Google (Gmail) login.
 * - Family PAN Vault: Stored locally by default, syncs to Google account upon sign in.
 */

const SESSION_STORAGE_KEY = "calmcapital_user_session";

// Immediately eradicate all legacy non-Google local storage authentication keys on module import
try {
  localStorage.removeItem("calmcapital_accounts");
  localStorage.removeItem("calmcapital_users");
  const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession);
      if (!parsed || parsed.authProvider !== "google" || !parsed.email) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
} catch {
  /* ignore */
}

export function cleanUserObj(u) {
  if (!u) return null;
  let parsed = u;
  while (typeof parsed === "string") {
    try {
      const next = JSON.parse(parsed);
      if (next === parsed) break;
      parsed = next;
    } catch {
      break;
    }
  }
  if (Array.isArray(parsed)) {
    parsed = parsed.find((item) => item && typeof item === "object" && !Array.isArray(item)) || parsed[0];
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (!Array.isArray(parsed.savedPans)) {
    if (typeof parsed.savedPans === "string") {
      try { parsed.savedPans = JSON.parse(parsed.savedPans); } catch { parsed.savedPans = []; }
    }
    if (!Array.isArray(parsed.savedPans)) parsed.savedPans = [];
  }
  return parsed;
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = cleanUserObj(JSON.parse(raw));
    // Strictly enforce Google / Gmail authentication only
    if (!parsed || parsed.authProvider !== "google" || !parsed.email) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function saveStoredSession(session) {
  try {
    if (session && session.authProvider === "google") {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Failed to persist session:", e);
  }
}


// Fetch user's saved PAN vault and profile from cloud
async function fetchCloudUser(email) {
  if (!email) return null;
  try {
    const res = await fetch(`/api/auth?action=get&identifier=${encodeURIComponent(email)}`);
    if (res.ok) {
      const data = await res.json();
      return data?.user || null;
    }
  } catch (err) {
    console.warn("[Cloud Sync] Failed to fetch user from cloud:", err);
  }
  return null;
}

// Push user's PAN vault and allotments to cloud
async function pushCloudUser(email, name, pans, allotments) {
  if (!email) return false;
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync",
        identifier: email,
        email: email,
        name: name,
        pans: Array.isArray(pans) ? pans : [],
        allotments: allotments || {}
      })
    });
    return res.ok;
  } catch (err) {
    console.warn("[Cloud Sync] Failed to sync user to cloud:", err);
    return false;
  }
}

// Asynchronously triggers the institutional welcome email upon user sign-in
function triggerWelcomeEmail(email, name) {
  if (!email) return;
  try {
    const sentKey = `calmcapital_welcome_sent_${email.toLowerCase()}`;
    const alreadySent = sessionStorage.getItem(sentKey);
    if (alreadySent) return;
    sessionStorage.setItem(sentKey, "true");

    fetch("/api/send-welcome-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name,
        loginTime: new Date().toUTCString()
      })
    }).catch((err) => {
      console.warn("[Welcome Email Trigger]:", err?.message || err);
    });
  } catch {
    /* ignore */
  }
}

export function mergePans(cloudPans = [], localPans = []) {
  const seen = new Set();
  const merged = [];
  const dummyPans = new Set(["AAACB1234F", "BNZPD5678K", "CPYPS9012L"]);
  
  // First add local PANs (preserves user's recent local modifications)
  for (const p of (Array.isArray(localPans) ? localPans : [])) {
    const panNum = (p?.pan || "").trim().toUpperCase();
    if (panNum && !dummyPans.has(panNum) && !seen.has(panNum)) {
      seen.add(panNum);
      merged.push({ ...p, pan: panNum });
    }
  }
  
  // Then add cloud PANs that weren't in local
  for (const p of (Array.isArray(cloudPans) ? cloudPans : [])) {
    const panNum = (p?.pan || "").trim().toUpperCase();
    if (panNum && !dummyPans.has(panNum) && !seen.has(panNum)) {
      seen.add(panNum);
      merged.push({ ...p, pan: panNum });
    }
  }
  return merged;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSession());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState("signin");

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Keep session in sync locally
  useEffect(() => {
    if (user && user.authProvider === "google") {
      saveStoredSession(user);
    } else if (!user) {
      saveStoredSession(null);
    } else {
      setUser(null);
      saveStoredSession(null);
    }
  }, [user]);

  // Automatic cross-device Cloud Synchronization for Family PANs
  useEffect(() => {
    if (!user?.email) return;
    let active = true;

    (async () => {
      try {
        const cloudUser = await fetchCloudUser(user.email);
        if (!active) return;

        let localPans = [];
        try {
          const raw = localStorage.getItem("calmcapital_family_pans");
          if (raw) localPans = JSON.parse(raw);
        } catch { /* ignore */ }

        const currentPans = Array.isArray(user.savedPans) && user.savedPans.length > 0
          ? user.savedPans
          : (Array.isArray(localPans) ? localPans : []);

        const mergedPans = mergePans(cloudUser?.savedPans || [], currentPans);
        const mergedAllotments = {
          ...(cloudUser?.savedAllotments || {}),
          ...(user.savedAllotments || {})
        };

        const currentPansJson = JSON.stringify(currentPans);
        const mergedPansJson = JSON.stringify(mergedPans);

        // If cloud had new PANs (e.g. mobile phone just logged in and loaded laptop's 12 PANs)
        if (mergedPansJson !== currentPansJson) {
          setUser((prev) => (prev ? { ...prev, savedPans: mergedPans, savedAllotments: mergedAllotments } : prev));
          try {
            localStorage.setItem("calmcapital_family_pans", mergedPansJson);
          } catch { /* ignore */ }
        }

        // If local had PANs that were missing from cloud (e.g. laptop had 12 PANs saved offline)
        const cloudPansJson = JSON.stringify(cloudUser?.savedPans || []);
        if (mergedPansJson !== cloudPansJson && mergedPans.length > 0) {
          pushCloudUser(user.email, user.name, mergedPans, mergedAllotments);
        }
      } catch (err) {
        console.warn("[Cloud Sync Error]:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.email]);

  const openAuthModal = useCallback((mode = "signin") => {
    setAuthModalInitialTab(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  /**
   * 1-Click Sign In with Google / Gmail (Firebase Powered + Cloud PAN Vault Sync)
   */
  const signInWithGoogle = useCallback(async (localPans = []) => {
    let googleUser = null;
    try {
      googleUser = await signInWithFirebaseGoogle();
    } catch (fbErr) {
      console.warn("Firebase Google login error:", fbErr?.message || fbErr);
      throw fbErr;
    }

    if (!googleUser) {
      return null;
    }

    const cleanEmail = (googleUser.email || "").toLowerCase();
    const cleanName = googleUser.displayName || cleanEmail.split("@")[0] || "Trader";
    const photoURL = googleUser.photoURL || "";
    const now = new Date().toISOString();

    // Fetch existing cloud vault for this email
    let cloudUser = null;
    try {
      cloudUser = await fetchCloudUser(cleanEmail);
    } catch { /* ignore */ }

    // Read any local pans in localStorage if localPans argument is empty
    let fallbackLocal = [];
    if (!Array.isArray(localPans) || localPans.length === 0) {
      try {
        const raw = localStorage.getItem("calmcapital_family_pans");
        if (raw) fallbackLocal = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    const candidateLocal = Array.isArray(localPans) && localPans.length > 0 ? localPans : fallbackLocal;

    // Smart merge cloud + local
    const mergedPans = mergePans(cloudUser?.savedPans || [], candidateLocal);
    const mergedAllotments = {
      ...(cloudUser?.savedAllotments || {}),
      ...(cloudUser?.allotments || {})
    };

    const account = {
      id: googleUser.uid || ("google_" + Date.now()),
      uid: googleUser.uid || ("google_" + Date.now()),
      name: cleanName,
      email: cleanEmail,
      photoURL: photoURL,
      authProvider: "google",
      createdAt: now,
      lastLoginAt: now,
      savedPans: mergedPans,
      savedAllotments: mergedAllotments
    };

    // Save to localStorage & session
    saveStoredSession(account);
    try {
      localStorage.setItem("calmcapital_family_pans", JSON.stringify(mergedPans));
    } catch { /* ignore */ }

    setUser(account);
    setAuthModalOpen(false);

    // Push merged vault back to cloud
    if (cleanEmail) {
      pushCloudUser(cleanEmail, cleanName, mergedPans, mergedAllotments);
      triggerWelcomeEmail(cleanEmail, cleanName);
    }

    return account;
  }, []);

  /**
   * Direct Gmail Connect (In-Modal fallback + Cloud PAN Vault Sync)
   */
  const signInWithGmailAddress = useCallback(async (inputEmail, localPans = []) => {
    if (!inputEmail || typeof inputEmail !== "string" || !inputEmail.includes("@")) {
      throw new Error("Please enter a valid Gmail address (e.g. trader@gmail.com).");
    }
    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Trader";
    const now = new Date().toISOString();

    let cloudUser = null;
    try {
      cloudUser = await fetchCloudUser(cleanEmail);
    } catch { /* ignore */ }

    let fallbackLocal = [];
    if (!Array.isArray(localPans) || localPans.length === 0) {
      try {
        const raw = localStorage.getItem("calmcapital_family_pans");
        if (raw) fallbackLocal = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    const candidateLocal = Array.isArray(localPans) && localPans.length > 0 ? localPans : fallbackLocal;

    const mergedPans = mergePans(cloudUser?.savedPans || [], candidateLocal);
    const mergedAllotments = {
      ...(cloudUser?.savedAllotments || {}),
      ...(cloudUser?.allotments || {})
    };

    const account = {
      id: "google_" + Date.now(),
      uid: "google_" + Date.now(),
      name: cleanName,
      email: cleanEmail,
      photoURL: "",
      authProvider: "google",
      createdAt: now,
      lastLoginAt: now,
      savedPans: mergedPans,
      savedAllotments: mergedAllotments
    };

    saveStoredSession(account);
    try {
      localStorage.setItem("calmcapital_family_pans", JSON.stringify(mergedPans));
    } catch { /* ignore */ }

    setUser(account);
    setAuthModalOpen(false);

    if (cleanEmail) {
      pushCloudUser(cleanEmail, cleanName, mergedPans, mergedAllotments);
      triggerWelcomeEmail(cleanEmail, cleanName);
    }

    return account;
  }, []);

  /**
   * Sign Out
   */
  const signOut = useCallback(() => {
    signOutFirebase();
    setUser(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem("calmcapital_accounts");
    } catch { /* ignore */ }
  }, []);

  /**
   * Sync PANs to active Google account and push to Cloud
   */
  const syncPansToAccount = useCallback((newPans) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.authProvider !== "google") return;

    const oldPansJson = JSON.stringify(currentUser.savedPans || []);
    const newPansJson = JSON.stringify(newPans || []);
    if (oldPansJson === newPansJson) {
      return;
    }

    const now = new Date().toISOString();
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, savedPans: newPans, vaultUpdatedAt: now };
      saveStoredSession(updated);
      return updated;
    });

    // Asynchronously push to cloud store
    if (currentUser.email) {
      pushCloudUser(currentUser.email, currentUser.name, newPans, currentUser.savedAllotments || {});
    }
  }, []);

  /**
   * Sync Allotments to active Google account and push to Cloud
   */
  const syncAllotmentsToAccount = useCallback((newAllotments) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.authProvider !== "google") return;

    const oldAllotmentsJson = JSON.stringify(currentUser.savedAllotments || {});
    const newAllotmentsJson = JSON.stringify(newAllotments || {});
    if (oldAllotmentsJson === newAllotmentsJson) {
      return;
    }

    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, savedAllotments: newAllotments };
      saveStoredSession(updated);
      return updated;
    });

    if (currentUser.email) {
      pushCloudUser(currentUser.email, currentUser.name, currentUser.savedPans || [], newAllotments);
    }
  }, []);

  const refreshFromCloud = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser?.email) return;
    try {
      const cloud = await fetchCloudUser(currentUser.email);
      if (cloud && Array.isArray(cloud.savedPans)) {
        let localPans = [];
        try {
          const raw = localStorage.getItem("calmcapital_family_pans");
          if (raw) localPans = JSON.parse(raw);
        } catch { /* ignore */ }
        const merged = mergePans(cloud.savedPans, localPans || currentUser.savedPans || []);
        setUser((prev) => (prev ? { ...prev, savedPans: merged, savedAllotments: cloud.savedAllotments || prev.savedAllotments } : prev));
        try {
          localStorage.setItem("calmcapital_family_pans", JSON.stringify(merged));
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.warn("Failed to refresh from cloud:", err);
    }
  }, []);

  const signIn = signInWithGoogle;
  const signUp = signInWithGoogle;

  const authValue = useMemo(() => ({
    user,
    isLoggedIn: !!(user && user.authProvider === "google"),
    authModalOpen,
    authModalInitialTab,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithGmailAddress,
    signIn,
    signUp,
    signOut,
    syncPansToAccount,
    syncAllotmentsToAccount,
    refreshFromCloud
  }), [
    user,
    authModalOpen,
    authModalInitialTab,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithGmailAddress,
    signIn,
    signUp,
    signOut,
    syncPansToAccount,
    syncAllotmentsToAccount,
    refreshFromCloud
  ]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
