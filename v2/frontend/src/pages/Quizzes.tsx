import { useState, useEffect } from 'react';
import { studyApi } from '../api/study';
import { useUIStore } from '../store/uiStore';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { 
  Award, 
  Clock, 
  TrendingUp, 
  HelpCircle,
  BarChart4,
  Calendar
} from 'lucide-react';

interface QuizAttempt {
  id: string;
  topic: string;
  score: number;
  totalQuestions: number;
  difficulty: string;
  type: string;
  timeSpentSeconds: number;
  createdAt: string;
}

export const Quizzes = () => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useUIStore();

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const data = await studyApi.listAttempts();
        setAttempts(data);
      } catch (err) {
        showToast('Failed to fetch quiz analytics history', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [showToast]);

  const totalAttempts = attempts.length;
  
  // Calculate aggregate score percentage
  const avgScorePct = totalAttempts > 0 
    ? Math.round((attempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / totalAttempts) * 100)
    : 0;

  const totalTimeSeconds = attempts.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
  const totalMinutes = Math.round(totalTimeSeconds / 60);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-r-2" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Analytics Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel border border-slate-800/40 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Quizzes</span>
            <p className="text-2xl font-black text-white">{totalAttempts}</p>
          </div>
          <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel border border-slate-800/40 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Average Score</span>
            <p className="text-2xl font-black text-white">{avgScorePct}%</p>
          </div>
          <div className="p-3 bg-accent/10 text-accent border border-accent/20 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel border border-slate-800/40 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Time Spent</span>
            <p className="text-2xl font-black text-white">{totalMinutes} mins</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Recharts */}
      {attempts.length > 0 && <AnalyticsChart attempts={attempts} />}

      {/* Quiz attempts table */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold tracking-tight text-white font-display flex items-center gap-2">
          <BarChart4 className="w-5 h-5 text-primary" />
          <span>Attempt Logs</span>
        </h2>

        {attempts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm font-medium border border-dashed border-slate-850 rounded-2xl">
            No quiz history recorded yet. Open Copilot to test your recall!
          </div>
        ) : (
          <div className="glass-panel border border-slate-800/40 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/40 text-slate-400 font-semibold font-mono text-[10px] uppercase tracking-wider">
                    <th className="p-4 pl-6">Date</th>
                    <th className="p-4">Topic</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Time</th>
                    <th className="p-4 pr-6 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {attempts.map((att) => {
                    const formattedDate = new Date(att.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    
                    const scorePct = Math.round((att.score / att.totalQuestions) * 100);

                    return (
                      <tr key={att.id} className="hover:bg-slate-900/25 transition-colors">
                        <td className="p-4 pl-6 text-slate-400 font-mono flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> {formattedDate}
                        </td>
                        <td className="p-4 font-bold text-slate-200">{att.topic}</td>
                        <td className="p-4 text-slate-400 font-mono uppercase">{att.type}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            att.difficulty === 'hard' 
                              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                              : att.difficulty === 'medium'
                              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {att.difficulty}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 font-mono">
                          {Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s
                        </td>
                        <td className="p-4 pr-6 text-right font-mono font-bold">
                          <span className={`${scorePct >= 70 ? 'text-emerald-450' : 'text-yellow-500'}`}>
                            {att.score} / {att.totalQuestions}
                          </span>
                          <span className="text-[10px] text-slate-500 block">({scorePct}%)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
