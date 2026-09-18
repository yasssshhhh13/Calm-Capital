import React, { useState, useEffect } from "react";
import { 
  X, 
  Mail, 
  Phone, 
  Lock, 
  User, 
  CheckCircle, 
  ShieldCheck, 
  ArrowRight, 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../auth";

export default function AuthModal({ isOpen, onClose, initialTab = "signin", currentLocalPans = [], currentLocalAllotments = {}, dark }) {
  const { signIn, signUp } = useAuth();

  const [tab, setTab] = useState(initialTab); // "signin" | "signup"
  const [method, setMethod] = useState("mobile"); // "mobile" | "email"
  
  // Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mergePans, setMergePans] = useState(true);

  // States
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    setError("");
    setSuccessMsg("");
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (tab === "signin") {
        const identifier = method === "mobile" ? mobile : email;
        if (!identifier.trim()) {
          throw new Error(`Please enter your ${method === "mobile" ? "10-digit Mobile Number" : "Email address"}.`);
        }
        if (!password) {
          throw new Error("Please enter your password.");
        }

        await signIn({ identifier, password });
        setSuccessMsg("Signed in successfully!");
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        // Sign Up
        if (!name.trim()) {
          throw new Error("Please enter your name.");
        }
        if (method === "mobile") {
          const cleanMobile = mobile.replace(/\D/g, "");
          if (cleanMobile.length !== 10) {
            throw new Error("Please enter a valid 10-digit Indian mobile number.");
          }
        } else {
          if (!email.trim() || !email.includes("@") || !email.includes(".")) {
            throw new Error("Please enter a valid email address.");
          }
        }
        if (!password || password.length < 4) {
          throw new Error("Password should be at least 4 characters.");
        }

        const initialPans = mergePans ? currentLocalPans : [];
        const initialAllotments = mergePans ? currentLocalAllotments : {};

        await signUp({
          name: name.trim(),
          email: method === "email" ? email.trim() : null,
          mobile: method === "mobile" ? mobile.trim() : null,
          password,
          initialPans,
          initialAllotments
        });

        setSuccessMsg("Account created and PANs synced!");
        setTimeout(() => {
          onClose();
        }, 700);
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-150 dark:border-white/5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1c9bda] to-teal-400 text-white flex items-center justify-center shadow-md shadow-[#1c9bda]/20">
              {tab === "signin" ? <LogIn size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-850 dark:text-white tracking-tight">
                  {tab === "signin" ? "Sign In to Account" : "Create Free Account"}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  Optional
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Save & sync your Family PAN Vault across devices
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer border-0 bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch: Sign In vs Sign Up */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setTab("signin");
                setError("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 ${
                tab === "signin"
                  ? "bg-white dark:bg-[#162234] text-slate-900 dark:text-white shadow-sm"
                  : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setError("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 ${
                tab === "signup"
                  ? "bg-white dark:bg-[#162234] text-slate-900 dark:text-white shadow-sm"
                  : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Method selector: Mobile vs Email */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMethod("mobile");
                setError("");
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                method === "mobile"
                  ? "bg-[#1c9bda]/10 dark:bg-[#1c9bda]/20 text-[#1c9bda] dark:text-[#52b1e4] border-[#1c9bda]/30"
                  : "bg-transparent text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300"
              }`}
            >
              <Phone size={13} />
              <span>Mobile Number</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("email");
                setError("");
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                method === "email"
                  ? "bg-[#1c9bda]/10 dark:bg-[#1c9bda]/20 text-[#1c9bda] dark:text-[#52b1e4] border-[#1c9bda]/30"
                  : "bg-transparent text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300"
              }`}
            >
              <Mail size={13} />
              <span>Email ID</span>
            </button>
          </div>

          {/* Name field (on Sign Up) */}
          {tab === "signup" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Yash Sharma"
                  className="w-full bg-slate-50 dark:bg-[#121D2D] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-[#1c9bda]"
                />
              </div>
            </div>
          )}

          {/* Mobile input */}
          {method === "mobile" ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Mobile Number
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className="flex-1 bg-slate-50 dark:bg-[#121D2D] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold tracking-wider text-slate-850 dark:text-white outline-none focus:border-[#1c9bda]"
                />
              </div>
            </div>
          ) : (
            /* Email input */
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-[#121D2D] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-[#1c9bda]"
                />
              </div>
            </div>
          )}

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Password
              </label>
              <span className="text-[10px] text-slate-400">
                {tab === "signup" ? "Min. 4 characters" : ""}
              </span>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-[#121D2D] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono text-slate-850 dark:text-white outline-none focus:border-[#1c9bda]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Auto-merge local PANs checkbox on sign up */}
          {tab === "signup" && currentLocalPans.length > 0 && (
            <label className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={mergePans}
                onChange={(e) => setMergePans(e.target.checked)}
                className="mt-0.5 rounded text-[#1c9bda]"
              />
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                Sync {currentLocalPans.length} locally saved PAN{currentLocalPans.length > 1 ? "s" : ""} to this new account
              </span>
            </label>
          )}

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#1c9bda] hover:bg-[#1c9bda]/90 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-[#1c9bda]/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <span>{tab === "signin" ? "Sign In" : "Create Account & Save PANs"}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Footer info banner */}
        <div className="p-4 px-6 border-t border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Login is optional. Your data is always encrypted.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer border-0 bg-transparent"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
