import { useUIStore } from '../store/uiStore';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export const GlobalToasts = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        return (
          <div 
            key={toast.id}
            className={`flex items-center justify-between gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-lg transition-all duration-300 animate-slide-in pointer-events-auto ${
              isError 
                ? 'bg-red-950/70 border-red-500/30 text-red-200' 
                : isSuccess 
                ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isError && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              {!isError && !isSuccess && <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />}
              <span className="text-sm font-medium">{toast.text}</span>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-xs opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
