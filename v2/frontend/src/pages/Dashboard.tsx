import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studyApi } from '../api/study';
import { pdfsApi } from '../api/pdfs';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { 
  Sparkles, 
  FileText, 
  Layers, 
  Calendar, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Clock,
  Flame,
  Zap,
  Brain,
  Database,
  Server,
  Cpu,
  Target,
  BookOpen,
  Award
} from 'lucide-react';

interface PDFDoc {
  id: string;
  filename: string;
  fileSize: number;
  status: string;
}

interface Deck {
  id: string;
  name: string;
  created_at?: string;
}

interface Plan {
  id: string;
  title: string;
  examDate: string;
  totalDays: number;
  totalHours: number;
  days?: Array<{
    activityDate: string;
    activities: Array<{
      topic: string;
      hours: number;
      activityType: string;
    }>;
  }>;
}

interface Attempt {
  id: string;
  topic: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
  difficulty: string;
}

export const Dashboard = () => {
  const [pdfs, setPdfs] = useState<PDFDoc[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [dueCount, setDueCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const { showToast } = useUIStore();
  const navigate = useNavigate();

  // Streak calculator helper
  const calculateStreak = (attemptList: Attempt[]) => {
    if (!attemptList || attemptList.length === 0) return 0;
    const dates = attemptList.map(a => new Date(a.createdAt).toISOString().split('T')[0]);
    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let expectedDate = new Date(uniqueDates[0]);
    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(expectedDate.getTime() - currentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        streak++;
        expectedDate = currentDate;
      } else {
        break;
      }
    }
    return streak;
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [pdfList, deckList, planList, attemptList] = await Promise.all([
          pdfsApi.list(),
          studyApi.listDecks(),
          studyApi.listPlans(),
          studyApi.listAttempts(),
        ]);
        
        setPdfs(pdfList.slice(0, 3));
        setDecks(deckList);
        setAttempts(attemptList);
        
        // Load detailed plans to check today's activities
        const detailedPlans = await Promise.all(
          planList.slice(0, 3).map(async (p: any) => {
            try {
              return await studyApi.getPlan(p.id);
            } catch {
              return p;
            }
          })
        );
        setPlans(detailedPlans);

        let count = 0;
        for (const deck of deckList) {
          try {
            const dueCards = await studyApi.getDueCards(deck.id);
            count += dueCards.length;
          } catch (e) {
            // soft fail
          }
        }
        setDueCount(count);
      } catch (err) {
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [showToast]);

  const streakCount = calculateStreak(attempts);
  const averageScore = attempts.length > 0 
    ? Math.round((attempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / attempts.length) * 100)
    : 0;

  // Find today's activities from active plans
  const todayStr = new Date().toISOString().split('T')[0];
  const todayActivities: Array<{ topic: string; hours: number; type: string; planTitle: string }> = [];
  plans.forEach(plan => {
    if (plan.days) {
      const todayDay = plan.days.find(d => d.activityDate.startsWith(todayStr));
      if (todayDay) {
        todayDay.activities.forEach(act => {
          todayActivities.push({
            topic: act.topic,
            hours: act.hours,
            type: act.activityType,
            planTitle: plan.title
          });
        });
      }
    }
  });

  const stats = [
    { name: 'Streak 🔥', value: `${streakCount} Days`, desc: 'Consecutive study days', color: 'border-orange-500/20 text-orange-400 bg-orange-500/5' },
    { name: 'Due Reviews', value: dueCount, desc: 'Cards needing attention', color: 'border-primary/20 text-primary bg-primary/5' },
    { name: 'Active plans', value: plans.length, desc: 'Study plans tracking', color: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5' },
    { name: 'Avg Accuracy', value: `${averageScore}%`, desc: 'Based on quiz metrics', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-r-2" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Greeting */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">
            {getGreeting()}, <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{user?.email.split('@')[0]}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm font-medium">Your customized workspace is synced and ready.</p>
          
          {/* AI / Tech Stack Badges Row showing Technical Depth */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="flex items-center gap-1 text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              <Brain className="w-3 h-3 text-primary" /> RAG Pipeline v2.0
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              <Zap className="w-3 h-3 text-amber-400" /> SuperMemo SM-2
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              <Database className="w-3 h-3 text-cyan-400" /> Chroma Vector DB
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              <Cpu className="w-3 h-3 text-pink-400" /> LLaMA-3 Engine
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              <Server className="w-3 h-3 text-emerald-400" /> Spring Boot MVC
            </span>
          </div>
        </div>

        <Link 
          to="/study" 
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/20 max-w-max hover:translate-y-[-1px]"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch AI Copilot</span>
        </Link>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.name}
            className={`glass-panel border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ${stat.color} hover:translate-y-[-2px]`}
          >
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.name}</span>
            <div className="mt-2">
              <p className="text-2xl font-black text-slate-100">{stat.value}</p>
              <p className="text-[10px] text-slate-550 mt-0.5 truncate">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Left Column (Agenda & Trends), Right Column (PDFs & Flashcards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (takes 2 span) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Agenda */}
          <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-200 font-display flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                <span>Today's Study Agenda</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </h2>
            
            {todayActivities.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm font-medium border border-dashed border-slate-850 rounded-xl bg-slate-900/10">
                🎉 No study activities scheduled for today. Enjoy your day or add a new study plan!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {todayActivities.map((act, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase border ${
                          act.type === 'study' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                          act.type === 'review' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                          'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                        }`}>
                          {act.type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">{act.hours} Hours</span>
                      </div>
                      <p className="text-sm font-bold text-slate-250 mt-2 truncate">{act.topic}</p>
                    </div>
                    <p className="text-[10px] text-slate-550 truncate border-t border-slate-850/60 pt-2">Plan: {act.planTitle}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Trend */}
          <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-200 font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Diagnostic & Study Accuracy Trend</span>
            </h2>

            {attempts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm font-medium border border-dashed border-slate-850 rounded-xl bg-slate-900/10">
                Perform interactive quizzes or diagnostic assessments to populate trends.
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.slice(0, 5).map((att) => {
                  const pct = Math.round((att.score / att.totalQuestions) * 100);
                  const isHigh = pct >= 70;
                  return (
                    <div key={att.id} className="space-y-1 p-3 rounded-lg bg-slate-900/40 border border-slate-850/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-350 truncate max-w-[65%]">{att.topic}</span>
                        <span className="text-slate-500 font-mono text-[10px]">{new Date(att.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 rounded-full bg-slate-800 flex-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold font-mono min-w-[40px] text-right ${isHigh ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {att.score}/{att.totalQuestions} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Material & Flashcards */}
        <div className="space-y-6">
          {/* Quick Study Actions */}
          <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-200 font-display">Quick Operations</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => navigate('/study')} className="p-3 text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-primary/25 transition-all space-y-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-slate-300">Study Copilot</p>
              </button>
              <button onClick={() => navigate('/pdfs')} className="p-3 text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-accent/25 transition-all space-y-1">
                <FileText className="w-4 h-4 text-accent" />
                <p className="text-xs font-bold text-slate-300">Indexed PDFs</p>
              </button>
              <button onClick={() => navigate('/flashcards')} className="p-3 text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500/25 transition-all space-y-1">
                <Layers className="w-4 h-4 text-pink-400" />
                <p className="text-xs font-bold text-slate-300">Review Cards</p>
              </button>
              <button onClick={() => navigate('/plans')} className="p-3 text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/25 transition-all space-y-1">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-bold text-slate-300">Manage Plans</p>
              </button>
            </div>
          </div>

          {/* Recent PDFs */}
          <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 font-display flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <span>Recent PDF Material</span>
              </h2>
              <Link to="/pdfs" className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5">
                <span>View all</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            
            {pdfs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-medium border border-dashed border-slate-850 rounded-xl bg-slate-900/10">
                Upload a course syllabus PDF to begin.
              </div>
            ) : (
              <div className="divide-y divide-slate-850">
                {pdfs.map((pdf) => (
                  <div key={pdf.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{pdf.filename}</p>
                        <p className="text-[10px] text-slate-550 font-mono">{(pdf.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      pdf.status === 'INDEXED' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    }`}>
                      {pdf.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Flashcard Decks */}
          <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-400" />
              <span>Spaced Repetition Decks</span>
            </h2>
            
            {decks.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-medium border border-dashed border-slate-850 rounded-xl bg-slate-900/10">
                No flashcard decks generated yet.
              </div>
            ) : (
              <div className="space-y-2">
                {decks.map((deck) => (
                  <div 
                    key={deck.id}
                    onClick={() => navigate(`/flashcards/${deck.id}`)}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-850 hover:border-pink-500/20 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-300 truncate">{deck.name}</p>
                      <p className="text-[10px] text-slate-550 font-mono mt-0.5">Click to start review</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-650 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
