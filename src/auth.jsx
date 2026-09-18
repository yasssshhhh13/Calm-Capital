import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * Calm Capital - Authentication & Cloud Account Engine
 * 100% Optional for users: Visitors can use Calm Capital as Guest (localStorage)
 * or Sign In / Sign Up via Email or Mobile Number to backup & sync PANs.
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

  // Keep session in sync
  useEffect(() => {
    saveStoredSession(user);
  }, [user]);

  const openAuthModal = useCallback((mode = "signin") => {
    setAuthModalInitialTab(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  /**
   * Sign Up with Email or Mobile
   */
  const signUp = useCallback(async ({ name, email, mobile, password, initialPans = [], initialAllotments = {} }) => {
    const accounts = getStoredAccounts();
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);

    if (!cleanEmail && !cleanMobile) {
      throw new Error("Please provide either a valid Email or Mobile Number.");
    }
    if (!password || password.length < 4) {
      throw new Error("Password must be at least 4 characters.");
    }

    // Check duplicate
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
      password: password, // client-persisted account demo
      loginType: cleanEmail ? "email" : "mobile",
      savedPans: Array.isArray(initialPans) ? initialPans : [],
      savedAllotments: initialAllotments || {},
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    accounts.push(newUser);
    saveStoredAccounts(accounts);

    // Strip password from memory session
    const { password: _, ...sessionUser } = newUser;
    setUser(sessionUser);
    return sessionUser;
  }, []);

  /**
   * Sign In with Email or Mobile
   */
  const signIn = useCallback(async ({ identifier, password }) => {
    const cleanId = (identifier || "").trim();
    if (!cleanId) {
      throw new Error("Please enter your registered Email or Mobile Number.");
    }
    if (!password) {
      throw new Error("Please enter your password.");
    }

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
  }, []);

  /**
   * Sign Out
   */
  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  /**
   * Sync PANs to active account
   */
  const syncPansToAccount = useCallback((newPans) => {
    if (!user) return;
    const accounts = getStoredAccounts();
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx !== -1) {
      accounts[idx].savedPans = newPans;
      saveStoredAccounts(accounts);
    }
    setUser((prev) => (prev ? { ...prev, savedPans: newPans } : null));
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
        syncAllotmentsToAccount
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
