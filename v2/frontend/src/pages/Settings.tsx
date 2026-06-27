import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { 
  User, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Database,
  Cpu,
  RefreshCcw
} from 'lucide-react';

export const Settings = () => {
  const user = useAuthStore((state) => state.user);
  const { showToast } = useUIStore();

  const handleClearCache = () => {
    localStorage.removeItem('user_preferences');
    showToast('Frontend preferences cleared', 'info');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-extrabold tracking-tight text-white font-display">System Settings</h2>

      {/* User Profile Info */}
      <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <span>User Profile Settings</span>
        </h3>
        <div className="space-y-3 font-mono text-xs md:text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <span className="text-slate-500">Email Address</span>
            <span className="text-slate-200 font-semibold">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <span className="text-slate-500">Account Type</span>
            <span className="text-slate-200 font-semibold">{user?.role}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Account ID</span>
            <span className="text-slate-400 font-bold">{user?.id}</span>
          </div>
        </div>
      </div>

      {/* AI Stack Specs */}
      <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent" />
          <span>AI Service Engine Specs</span>
        </h3>
        <div className="space-y-3 font-mono text-xs md:text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <span className="text-slate-500">LLM Orchestration Model</span>
            <span className="text-slate-200 font-semibold">llama-3.1-8b-instant (via Groq API)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <span className="text-slate-500">Dense Embedding Vectorizer</span>
            <span className="text-slate-200 font-semibold">all-MiniLM-L6-v2 (sentence-transformers)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <span className="text-slate-500">Cross-Encoder Reranker</span>
            <span className="text-slate-200 font-semibold">ms-marco-MiniLM-L-6-v2</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Cache Layer</span>
            <span className="text-slate-200 font-semibold">Redis (TTL 1-Hour)</span>
          </div>
        </div>
      </div>

      {/* Preferences Actions */}
      <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-primary" />
          <span>Local Settings</span>
        </h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-300">Clear Cache</p>
            <p className="text-xs text-slate-500 mt-0.5">Reset locally saved frontend sidebar choices & notifications.</p>
          </div>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-semibold transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reset Cache</span>
          </button>
        </div>
      </div>
    </div>
  );
};
