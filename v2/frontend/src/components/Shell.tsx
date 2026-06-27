import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUIStore } from '../store/uiStore';
import { 
  BookOpen, 
  FileText, 
  MessageSquare, 
  Layers, 
  Award, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ShellProps {
  children?: React.ReactNode;
}

export const Shell = ({ children }: ShellProps) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, toasts, removeToast } = useUIStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Sparkles },
    { name: 'PDFs & Uploads', path: '/pdfs', icon: FileText },
    { name: 'AI RAG Chat', path: '/chat', icon: MessageSquare },
    { name: 'Study Content', path: '/study', icon: BookOpen },
    { name: 'Spaced Decks', path: '/flashcards', icon: Layers },
    { name: 'Quiz Analytics', path: '/quizzes', icon: Award },
    { name: 'Study Plans', path: '/plans', icon: Calendar },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#0F172A] text-slate-100 font-sans overflow-x-hidden">
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col w-64 glass-panel border-r border-slate-800/40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/40">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-display">
              StudyMate AI <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">v2</span>
            </span>
          </div>
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary/25 to-accent/10 border-l-4 border-primary text-slate-100 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-slate-800/40">
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/50 border border-slate-800/30">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">{user?.email}</p>
              <p className="text-xs text-slate-500 font-mono uppercase">{user?.role}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${sidebarOpen ? 'md:pl-64' : ''}`}>
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-6 glass-panel border-b border-slate-800/30 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={toggleSidebar} 
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <h2 className="text-lg font-bold tracking-tight font-display">
              {navItems.find(item => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)))?.name || 'StudyMate AI'}
            </h2>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
