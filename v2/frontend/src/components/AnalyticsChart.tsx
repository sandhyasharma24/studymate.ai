import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

interface QuizAttempt {
  id: string;
  topic: string;
  score: number;
  totalQuestions: number;
  difficulty: string;
  type: string;
  createdAt: string;
}

interface AnalyticsChartProps {
  attempts: QuizAttempt[];
}

export const AnalyticsChart = ({ attempts }: AnalyticsChartProps) => {
  // Sort attempts chronologically
  const sortedAttempts = [...attempts]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((att, idx) => ({
      index: idx + 1,
      date: new Date(att.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.round((att.score / att.totalQuestions) * 100),
      topic: att.topic,
    }));

  // Group by topic to show topics count / average
  const topicDataMap: Record<string, { topic: string; count: number; totalScore: number }> = {};
  attempts.forEach((att) => {
    const scorePct = (att.score / att.totalQuestions) * 100;
    if (!topicDataMap[att.topic]) {
      topicDataMap[att.topic] = { topic: att.topic, count: 0, totalScore: 0 };
    }
    topicDataMap[att.topic].count += 1;
    topicDataMap[att.topic].totalScore += scorePct;
  });

  const topicData = Object.values(topicDataMap).map((d) => ({
    topic: d.topic,
    avgScore: Math.round(d.totalScore / d.count),
    attemptsCount: d.count,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Score Trend Chart */}
      <div className="glass-panel border border-slate-800/40 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 font-display">Quiz Score Progression (%)</h3>
        {sortedAttempts.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-slate-500 text-sm font-medium">
            Take a quiz to view score trends.
          </div>
        ) : (
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sortedAttempts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Topic Mastery Chart */}
      <div className="glass-panel border border-slate-800/40 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 font-display">Topic Average Performance (%)</h3>
        {topicData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-slate-500 text-sm font-medium">
            Take a quiz to view topic mastery.
          </div>
        ) : (
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="topic" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Bar dataKey="avgScore" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
