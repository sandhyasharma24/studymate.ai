import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, KeyRound, Mail, Sparkles } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const success = await login({ email, password });
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F19] text-slate-200 px-4 select-none relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[35rem] h-[35rem] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Box */}
      <div className="w-full max-w-md glass-panel border border-slate-800/40 rounded-2xl p-8 relative z-10 space-y-6 shadow-2xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white shadow-lg">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-display mt-2">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 font-medium">Log in to sync your study metrics & spaced repetition deck</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800/60 rounded-xl placeholder-slate-650 focus:outline-none focus:border-primary text-slate-100 transition-colors focus:ring-1 focus:ring-primary text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800/60 rounded-xl placeholder-slate-650 focus:outline-none focus:border-primary text-slate-100 transition-colors focus:ring-1 focus:ring-primary text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <Sparkles className="w-4.5 h-4.5" />}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center pt-2">
          <p className="text-sm text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-primary-hover font-semibold transition-colors">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
