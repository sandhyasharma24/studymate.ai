import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUIStore } from '../store/uiStore';
import { BookOpen, KeyRound, Mail, Sparkles, UserCheck } from 'lucide-react';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const { register, loading, isAuthenticated } = useAuth();
  const { showToast } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match!', 'error');
      return;
    }
    const success = await register({ email, password, role });
    if (success) {
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F19] text-slate-200 px-4 select-none relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[35rem] h-[35rem] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Register Box */}
      <div className="w-full max-w-md glass-panel border border-slate-800/40 rounded-2xl p-8 relative z-10 space-y-6 shadow-2xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white shadow-lg">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-display mt-2">
            Create Account
          </h1>
          <p className="text-sm text-slate-500 font-medium">Join StudyMate AI to generate smart spaced repetition decks</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-3 py-3.5 bg-slate-950 border border-slate-800/60 rounded-xl placeholder-slate-650 focus:outline-none focus:border-primary text-slate-100 transition-colors focus:ring-1 focus:ring-primary text-xs font-medium"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-3 py-3.5 bg-slate-950 border border-slate-800/60 rounded-xl placeholder-slate-650 focus:outline-none focus:border-primary text-slate-100 transition-colors focus:ring-1 focus:ring-primary text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Role</label>
            <div className="relative">
              <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800/60 rounded-xl focus:outline-none focus:border-primary text-slate-200 transition-colors focus:ring-1 focus:ring-primary text-sm font-medium appearance-none"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher / Academic</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
            {!loading && <Sparkles className="w-4.5 h-4.5" />}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center pt-2">
          <p className="text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-hover font-semibold transition-colors">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
