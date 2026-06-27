import { Calendar as CalendarIcon, CheckCircle2, BookOpen, RefreshCw, Award, AlertTriangle } from 'lucide-react';

interface Activity {
  id: string;
  topic: string;
  hours: number;
  activityType: string;
}

interface StudyDay {
  id: string;
  activityDate: string;
  activities: Activity[];
}

interface StudyCalendarProps {
  days: StudyDay[];
  examDate?: string;
}

export const StudyCalendar = ({ days, examDate }: StudyCalendarProps) => {
  // Sort days chronologically
  const sortedDays = [...days].sort(
    (a, b) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime()
  );

  // Compute countdown banner if examDate is provided
  const getExamCountdown = () => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null;
    if (diffDays === 0) return { days: 0, text: "Exam is TODAY!", color: "from-red-600 to-pink-600 animate-pulse text-white" };
    if (diffDays === 1) return { days: 1, text: "Exam is TOMORROW!", color: "from-red-500 to-orange-500 text-white" };
    if (diffDays <= 7) return { days: diffDays, text: `Only ${diffDays} days left until your exam!`, color: "from-amber-600 to-orange-500 text-white" };
    return { days: diffDays, text: `${diffDays} days until exam`, color: "from-slate-900 to-slate-800 text-slate-300" };
  };

  const countdown = getExamCountdown();

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <CalendarIcon className="w-5 h-5" />
          <span className="font-display text-base">Personalized Study Roadmap</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500"></span> Study</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500"></span> Review</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></span> Quiz</span>
        </div>
      </div>

      {/* Countdown Alert Banner */}
      {countdown && (
        <div className={`p-4 rounded-2xl bg-gradient-to-r ${countdown.color} border border-white/5 flex items-center gap-3 shadow-lg`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-bold tracking-tight">{countdown.text}</span>
        </div>
      )}

      {sortedDays.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm font-medium border border-dashed border-slate-880 rounded-xl">
          No calendar events scheduled yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedDays.map((day) => {
            const formattedDate = new Date(day.activityDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            // Calculate total daily hours and find dominant activity type
            const totalHours = day.activities.reduce((acc, curr) => acc + curr.hours, 0);
            
            // Dom activity type
            const types = day.activities.map(a => a.activityType);
            const domType = types.sort((a,b) =>
              types.filter(v => v===a).length - types.filter(v => v===b).length
            ).pop() || 'study';

            // Left border gradient classes based on dominant type
            const borderClass = 
              domType === 'study' ? 'border-l-[4px] border-l-red-500' :
              domType === 'review' ? 'border-l-[4px] border-l-amber-500' :
              'border-l-[4px] border-l-emerald-500';

            return (
              <div 
                key={day.id}
                className={`glass-panel rounded-2xl p-5 border border-slate-800/40 space-y-4 hover:border-slate-700/60 transition-all duration-300 ${borderClass} flex flex-col justify-between`}
              >
                <div>
                  {/* Date header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
                    <span className="text-sm font-bold text-slate-200">{formattedDate}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        Day {sortedDays.indexOf(day) + 1}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-350 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        {totalHours.toFixed(1)} hrs
                      </span>
                    </div>
                  </div>

                  {/* Day's Activities */}
                  <div className="space-y-2.5 mt-4">
                    {day.activities.map((activity) => {
                      const isStudy = activity.activityType === 'study';
                      const isReview = activity.activityType === 'review';
                      
                      const Icon = isStudy ? BookOpen : isReview ? RefreshCw : Award;
                      const typeColor = 
                        isStudy ? 'text-red-400 bg-red-500/10 border-red-500/20' : 
                        isReview ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 
                        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                      return (
                        <div 
                          key={activity.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg border ${typeColor} flex-shrink-0`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-200 truncate">{activity.topic}</p>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{activity.activityType}</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-300 px-2.5 py-1 bg-slate-950 border border-slate-850 rounded-lg">
                            {activity.hours} hrs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Progress bar showing daily hours relative to max hours (e.g. 6 hrs max for visuals) */}
                <div className="pt-2 border-t border-slate-800/20">
                  <div className="h-1 rounded-full bg-slate-850 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        domType === 'study' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                        domType === 'review' ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                        'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                      style={{ width: `${Math.min((totalHours / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
