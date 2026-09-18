import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * Calm Capital - Cloud Authentication & PAN Vault Sync Engine
 * 100% Optional for users: Visitors can use Calm Capital as Guest (localStorage)
 * or Sign In / Sign Up via Email or Mobile Number to backup & sync PANs across devices.
 * 
 * Works with /api/auth serverless cloud store and local fallback.
 * Supports bidirectional instant synchronization for: Add, Edit, and Delete across devices.
 */

const ACCOUNTS_STORAGE_KEY = "calmcapital_accounts";
const SESSION_STORAGE_KEY = "calmcapital_user_session";

const AuthContext = createContext(null);

function getStoredAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to persist accounts:", e);
  }
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Failed to persist session:", e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSession());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState("signin"); // "signin" | "signup"

  // Keep session in sync locally
  useEffect(() => {
    saveStoredSession(user);
  }, [user]);

  /**
   * Pull latest PANs & updates from cloud (reflecting additions, edits, and deletions)
   */
  const refreshFromCloud = useCallback(async () => {
    if (!user || (!user.mobile && !user.email)) return;
    try {
      const id = user.mobile || user.email;
      const res = await fetch(`/api/auth?action=get&identifier=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user && Array.isArray(data.user.savedPans)) {
          const cloudTime = new Date(data.user.vaultUpdatedAt || data.user.lastLoginAt || 0).getTime();
          const localTime = new Date(user.vaultUpdatedAt || 0).getTime();
          if (cloudTime >= localTime || !user.vaultUpdatedAt) {
            setUser((prev) => (prev ? { ...prev, ...data.user } : null));
          }
        }
      }
    } catch {}
  }, [user]);

  // Sync on startup and whenever user focuses or returns to the browser tab
  useEffect(() => {
    refreshFromCloud();
    const handleFocus = () => refreshFromCloud();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshFromCloud]);

  const openAuthModal = useCallback((mode = "signin") => {
    setAuthModalInitialTab(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  /**
   * Sign Up with Email or Mobile (Cloud + Local)
   */
  const signUp = useCallback(async ({ name, email, mobile, password, initialPans = [], initialAllotments = {} }) => {
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);

    if (!cleanEmail && !cleanMobile) {
      throw new Error("Please provide either a valid Email or Mobile Number.");
    }
    if (!password || password.length < 4) {
      throw new Error("Password must be at least 4 characters.");
    }

    const now = new Date().toISOString();

    // Try cloud signup first
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          name: cleanName,
          email: cleanEmail || null,
          mobile: cleanMobile || null,
          password: password,
          initialPans: Array.isArray(initialPans) ? initialPans : [],
          initialAllotments: initialAllotments || {},
          vaultUpdatedAt: now
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sign Up failed. Please check your details.");
      }

      const cloudUser = { ...data.user, vaultUpdatedAt: now };
      setUser(cloudUser);

      // Save locally as backup
      const accounts = getStoredAccounts();
      const existingIdx = accounts.findIndex((a) => (cleanMobile && a.mobile === cleanMobile) || (cleanEmail && a.email === cleanEmail));
      if (existingIdx !== -1) {
        accounts[existingIdx] = { ...cloudUser, password };
      } else {
        accounts.push({ ...cloudUser, password });
      }
      saveStoredAccounts(accounts);

      return cloudUser;
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes("fetch")) {
        throw apiErr;
      }

      const accounts = getStoredAccounts();
      if (cleanEmail && accounts.some((a) => a.email && a.email.toLowerCase() === cleanEmail)) {
        throw new Error("An account with this Email already exists. Please Sign In.");
      }
      if (cleanMobile && accounts.some((a) => a.mobile === cleanMobile)) {
        throw new Error("An account with this Mobile Number already exists. Please Sign In.");
      }

      const newUser = {
        id: "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        name: cleanName || (cleanEmail ? cleanEmail.split("@")[0] : `User ${cleanMobile.slice(-4)}`),
        email: cleanEmail || null,
        mobile: cleanMobile || null,
        password: password,
        loginType: cleanEmail ? "email" : "mobile",
        savedPans: Array.isArray(initialPans) ? initialPans : [],
        savedAllotments: initialAllotments || {},
        vaultUpdatedAt: now,
        createdAt: now,
        lastLoginAt: now
      };

      accounts.push(newUser);
      saveStoredAccounts(accounts);

      const { password: _, ...sessionUser } = newUser;
      setUser(sessionUser);
      return sessionUser;
    }
  }, []);

  /**
   * Sign In with Email or Mobile (Cloud + Local)
   */
  const signIn = useCallback(async ({ identifier, password }) => {
    const cleanId = (identifier || "").trim();
    if (!cleanId) {
      throw new Error("Please enter your registered Email or Mobile Number.");
    }
    if (!password) {
      throw new Error("Please enter your password.");
    }

    // Try cloud authentication first for cross-device support
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signin",
          identifier: cleanId,
          password: password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please verify credentials.");
      }

      const cloudUser = data.user;
      setUser(cloudUser);

      // Save locally as backup
      const accounts = getStoredAccounts();
      const existingIdx = accounts.findIndex((a) => a.id === cloudUser.id || (cloudUser.mobile && a.mobile === cloudUser.mobile));
      if (existingIdx !== -1) {
        accounts[existingIdx] = { ...cloudUser, password };
      } else {
        accounts.push({ ...cloudUser, password });
      }
      saveStoredAccounts(accounts);

      return cloudUser;
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes("fetch")) {
        throw apiErr;
      }

      // Local fallback
      const accounts = getStoredAccounts();
      const isMobile = /^\d{10}$/.test(cleanId.replace(/\D/g, "").slice(-10)) && !cleanId.includes("@");
      const cleanMobile = isMobile ? cleanId.replace(/\D/g, "").slice(-10) : null;
      const cleanEmail = !isMobile ? cleanId.toLowerCase() : null;

      const account = accounts.find((a) => {
        if (cleanMobile && a.mobile === cleanMobile) return true;
        if (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) return true;
        return false;
      });

      if (!account) {
        throw new Error("No account found with this Email or Mobile. Please Sign Up.");
      }

      if (account.password !== password) {
        throw new Error("Incorrect password. Please verify and try again.");
      }

      account.lastLoginAt = new Date().toISOString();
      saveStoredAccounts(accounts);

      const { password: _, ...sessionUser } = account;
      setUser(sessionUser);
      return sessionUser;
    }
  }, []);

  /**
   * Sign Out
   */
  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  /**
   * Sync PANs to active account (Cloud + Local)
   * Reliably saves additions, edits, and deletions across devices.
   */
  const syncPansToAccount = useCallback((newPans) => {
    if (!user) return;
    const now = new Date().toISOString();
    const accounts = getStoredAccounts();
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx !== -1) {
      accounts[idx].savedPans = newPans;
      accounts[idx].vaultUpdatedAt = now;
      saveStoredAccounts(accounts);
    }
    setUser((prev) => (prev ? { ...prev, savedPans: newPans, vaultUpdatedAt: now } : null));

    // Background push to cloud
    if (user.mobile || user.email) {
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          identifier: user.mobile || user.email,
          mobile: user.mobile,
          email: user.email,
          pans: newPans,
          vaultUpdatedAt: now
        })
      }).catch(() => {});
    }
  }, [user]);

  /**
   * Sync Allotments to active account
   */
  const syncAllotmentsToAccount = useCallback((newAllotments) => {
    if (!user) return;
    const accounts = getStoredAccounts();
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx !== -1) {
      accounts[idx].savedAllotments = newAllotments;
      saveStoredAccounts(accounts);
    }
    setUser((prev) => (prev ? { ...prev, savedAllotments: newAllotments } : null));

    if (user.mobile || user.email) {
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          identifier: user.mobile || user.email,
          mobile: user.mobile,
          email: user.email,
          allotments: newAllotments
        })
      }).catch(() => {});
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        authModalOpen,
        authModalInitialTab,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
        syncPansToAccount,
        syncAllotmentsToAccount,
        refreshFromCloud
      }}
    >
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
