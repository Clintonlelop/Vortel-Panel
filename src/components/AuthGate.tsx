import React, { useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck, User, Mail, Lock, Sparkles, Key } from "lucide-react";

interface AuthGateProps {
  onSuccess: (username: string, email: string) => void;
}

export default function AuthGate({ onSuccess }: AuthGateProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && !username) {
      setError("Please input a display username.");
      return;
    }
    if (!email || !password) {
      setError("Credentials required.");
      return;
    }

    setLoading(true);

    // Simulate safe database registration & hashing delay
    setTimeout(() => {
      setLoading(false);
      onSuccess(isSignUp ? username : "Administrator", email);
    }, 1200);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-white/5 bg-[#0e0e13]/90 p-8 shadow-2xl backdrop-blur-md space-y-6"
      >
        {/* Branding Crest */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <ShieldCheck className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">
              VORTEX PANEL
            </h1>
            <p className="text-xs text-gray-400 tracking-wider font-semibold uppercase mt-0.5">
              Secure Virtual Container Gateway
            </p>
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-500/10 bg-rose-950/20 p-3 text-xs font-bold text-rose-400 text-center animate-shake">
              {error}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Clinton Dev"
                  className="w-full rounded-xl border border-white/5 bg-[#060609] py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. clinton@domain.com"
                className="w-full rounded-xl border border-white/5 bg-[#060609] py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/5 bg-[#060609] py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30 transition-all"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01, boxShadow: "0 0 15px rgba(168,85,247,0.25)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all cursor-pointer shadow-lg hover:bg-purple-500"
          >
            {loading ? "Authenticating Session..." : isSignUp ? "Create Admin Account" : "Access Container Hub"}
          </motion.button>
        </form>

        {/* Switching mode links */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-[11px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
          >
            {isSignUp ? "Already registered? Login Here" : "Create New Access Account"}
          </button>
        </div>

        {/* Security watermark */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider border-t border-white/5 pt-4">
          <Key size={12} className="text-purple-500" />
          <span>Local virtual sandbox session protected.</span>
        </div>
      </motion.div>
    </div>
  );
}
