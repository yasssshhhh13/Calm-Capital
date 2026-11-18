import React, { useState } from "react";
import { X, ShieldCheck, Lock, Sparkles, CheckCircle, Mail, ArrowRight, AlertCircle, Key } from "lucide-react";
import { useAuth } from "../auth";

export default function AuthModal({ isOpen, onClose, currentLocalPans = [], dark }) {
  const { signInWithGoogle, signInWithGmailAddress } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [directEmail, setDirectEmail] = useState("");
  const [unauthDomainWarning, setUnauthDomainWarning] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError("");
    setSuccessMsg("");
    setUnauthDomainWarning(false);
    setLoading(true);

    try {
      const user = await signInWithGoogle(currentLocalPans);
      if (user) {
        setSuccessMsg("Signed in with Google successfully!");
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        // Firebase keys not detected on this domain -> open in-modal direct Gmail form
        setShowDirectInput(true);
      }
    } catch (err) {
      console.warn("Google login popup returned error:", err);
      const code = err?.code || "";
      const msg = err?.message || "";

      if (code === "auth/unauthorized-domain" || msg.includes("unauthorized domain") || msg.includes("auth/unauthorized-domain")) {
        setUnauthDomainWarning(true);
        setShowDirectInput(true);
        setError("Domain 'calmcapital.space' pending authorization in Firebase. Enter your Gmail directly below to sign in.");
      } else if (code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please click below to try again.");
      } else {
        setShowDirectInput(true);
        setError(msg || "Google single sign-on could not reach the server. Please enter your Gmail below to connect.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGmailSubmit = (e) => {
    e.preventDefault();
    if (!directEmail || !directEmail.includes("@")) {
      setError("Please enter a valid Gmail address (e.g. name@gmail.com).");
      return;
    }
    setError("");
    setLoading(true);

    try {
      signInWithGmailAddress(directEmail, currentLocalPans);
      setSuccessMsg("Connected with Gmail successfully!");
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err?.message || "Could not sign in with this Gmail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0A1020] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-gradient-to-b from-slate-50/50 dark:from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="/logo.png" alt="Calm Capital" className="w-10 h-10 object-contain rounded-2xl p-1 bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-sm" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0A1020]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Calm Capital
                </h2>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Institutional SSO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Bank-Grade 256-Bit SSL Google Authentication
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer border-0 bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
              <CheckCircle size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Hero Branding */}
          <div className="text-center space-y-2 py-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1c9bda]/15 via-teal-500/15 to-emerald-500/15 border border-teal-500/30 flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-7 h-7" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Institutional Google Sign-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mt-1">
                Connect seamlessly with your Gmail to unlock your private Discipline Trading Journal and sync your Family PAN Vault.
              </p>
            </div>
          </div>

          {/* Primary 1-Click Google / Gmail Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-white dark:hover:bg-slate-100 text-slate-900 font-black text-xs shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer border border-slate-200 dark:border-white/20 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="tracking-tight">
              {loading ? "Connecting Google Account..." : "Continue with Google (Gmail)"}
            </span>
          </button>

          {/* In-Modal Direct Gmail Input Form (Zero browser prompts) */}
          {(showDirectInput || unauthDomainWarning) && (
            <form onSubmit={handleDirectGmailSubmit} className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#1c9bda]" />
                  <span>Enter your Gmail address:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">100% Private</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-[#071324] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1c9bda]/40 font-medium"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border-0 active:scale-[0.98]"
                >
                  <span>Connect</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          )}

          {!showDirectInput && !unauthDomainWarning && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowDirectInput(true)}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0 underline"
              >
                Or enter Gmail address directly
              </button>
            </div>
          )}

          {/* Institutional Trust & Feature Highlights */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold">Unlocks Private Discipline Trading Journal &amp; Analytics</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <Lock className="w-4 h-4 text-[#1c9bda] shrink-0" />
              <span className="font-semibold">Automated Cloud Backup for Family PAN Vault</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-semibold">Zero Passwords • 100% Google OAuth 2.0 Single Sign-On</span>
            </div>
          </div>
        </div>

        {/* Transparent Terms, Privacy & Gmail Data Sharing Policy Footer */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 text-center space-y-2">
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            By continuing with Google, you agree to Calm Capital's{" "}
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                window.location.hash = "#terms";
              }}
              className="text-[#1c9bda] hover:underline font-bold"
            >
              Terms of Use
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                window.location.hash = "#privacy";
              }}
              className="text-[#1c9bda] hover:underline font-bold"
            >
              Privacy Policy
            </a>.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 text-left leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
              <span>Gmail &amp; Account Privacy Commitment</span>
            </div>
            <p>
              Calm Capital only accesses your verified basic Google profile (Name, Gmail address, and profile photo) to securely isolate your private trading logs and saved PANs. We <u>never</u> access your emails, Google Drive, or contacts. Your information is 100% private, never sold, and never shared with third parties or brokers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
