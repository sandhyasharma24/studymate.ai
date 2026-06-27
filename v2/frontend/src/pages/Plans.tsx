import React, { useState, useEffect } from 'react';
import { studyApi } from '../api/study';
import { pdfsApi } from '../api/pdfs';
import { useUIStore } from '../store/uiStore';
import { StudyCalendar } from '../components/StudyCalendar';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  Clock,
  ChevronLeft,
  CheckCircle2,
  BrainCircuit
} from 'lucide-react';

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

interface Plan {
  id: string;
  title: string;
  examDate: string;
  hoursPerDay: number;
  totalDays: number;
  totalHours: number;
  days?: StudyDay[];
}

interface PDFDoc {
  id: string;
  filename: string;
  status: string;
}

export const Plans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [selectedPdfId, setSelectedPdfId] = useState<string>('');
  const [pdfs, setPdfs] = useState<PDFDoc[]>([]);

  // Wizard States
  const [createStep, setCreateStep] = useState<'none' | 'form' | 'diagnostic'>('none');
  const [diagnosticData, setDiagnosticData] = useState<{ validated_topics: string[], quiz: any[] } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const { showToast } = useUIStore();

  const fetchPlans = async () => {
    try {
      const data = await studyApi.listPlans();
      setPlans(data);
    } catch (e) {
      showToast('Failed to load study plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    const fetchPdfs = async () => {
      try {
        const data = await pdfsApi.list();
        setPdfs(data.filter((p: any) => p.status === 'INDEXED'));
      } catch (e) {
        // fail silently
      }
    };
    fetchPdfs();
  }, []);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!selectedPlanId) {
        setSelectedPlan(null);
        return;
      }
      setLoading(true);
      try {
        const data = await studyApi.getPlan(selectedPlanId);
        setSelectedPlan(data);
      } catch (e) {
        showToast('Failed to load study plan details', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPlanDetails();
  }, [selectedPlanId]);

  const handleGenerateDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !examDate || !topicsInput.trim()) return;

    setCreating(true);
    try {
      const payload = {
        topics: topicsInput.split(',').map(t => t.trim()).filter(Boolean),
        pdfCollection: selectedPdfId ? selectedPdfId : undefined
      };
      
      const res = await studyApi.generateDiagnostic(payload);
      setDiagnosticData(res);
      setQuizAnswers({});
      setCreateStep('diagnostic');
      showToast('AI validated topics and generated diagnostic quiz.', 'success');
    } catch (err) {
      showToast('Failed to generate diagnostic assessment', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!diagnosticData) return;
    
    // Check if all questions are answered
    if (Object.keys(quizAnswers).length < diagnosticData.quiz.length) {
      showToast('Please answer all questions before generating the plan.', 'error');
      return;
    }

    setCreating(true);
    
    // Track stats per topic
    const topicStats: Record<string, { correct: number, total: number }> = {};
    diagnosticData.validated_topics.forEach(t => {
      topicStats[t.toLowerCase().trim()] = { correct: 0, total: 0 };
    });

    diagnosticData.quiz.forEach((q, i) => {
      const qTopic = (q.topic || '').toLowerCase().trim();
      if (qTopic && topicStats[qTopic]) {
        topicStats[qTopic].total++;
        const userAns = (quizAnswers[i] || '').trim().toUpperCase();
        const correctAns = (q.answer || '').trim().toUpperCase();
        if (userAns === correctAns) {
          topicStats[qTopic].correct++;
        }
      }
    });
    
    const masteryLevels: Record<string, number> = {};
    diagnosticData.validated_topics.forEach(t => {
      const stats = topicStats[t.toLowerCase().trim()];
      if (stats && stats.total > 0) {
        masteryLevels[t] = Math.max(0.1, stats.correct / stats.total);
      } else {
        masteryLevels[t] = 0.5; // fallback
      }
    });

    try {
      const newPlan = await studyApi.createPlan({
        title,
        examDate,
        topics: diagnosticData.validated_topics,
        hoursPerDay,
        masteryLevels,
        pdfCollection: selectedPdfId ? selectedPdfId : undefined,
      });

      showToast('Study plan generated based on your assessment!', 'success');
      setCreateStep('none');
      setTitle('');
      setExamDate('');
      setTopicsInput('');
      setHoursPerDay(2);
      fetchPlans();
      setSelectedPlanId(newPlan.id);
    } catch (err) {
      showToast('Failed to generate study plan', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Delete this study plan calendar permanently?')) return;
    try {
      await studyApi.deletePlan(planId);
      showToast('Study plan deleted', 'info');
      setSelectedPlanId('');
      fetchPlans();
    } catch (e) {
      showToast('Failed to delete study plan', 'error');
    }
  };

  if (loading && !creating) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-r-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {selectedPlan ? (
        /* Detailed Plan Roadmap View */
        <div className="space-y-6">
          {/* Header navigation bar */}
          <div className="flex items-center justify-between gap-4 p-5 glass-panel rounded-2xl border border-slate-800/40">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedPlanId('')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Active Study Plan</span>
                <h2 className="text-lg font-bold text-slate-200 mt-0.5">{selectedPlan.title}</h2>
              </div>
            </div>

            <button 
              onClick={() => handleDelete(selectedPlan.id)}
              className="p-2.5 rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-colors"
              title="Delete Study Plan"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Quick stats banner */}
          <div className="grid grid-cols-3 gap-4 p-5 glass-panel rounded-2xl border border-slate-800/40 text-center font-mono">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Duration</p>
              <p className="text-base md:text-lg font-black text-slate-200 mt-1">{selectedPlan.totalDays} Days</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Hours / Day</p>
              <p className="text-base md:text-lg font-black text-primary mt-1">{selectedPlan.hoursPerDay} hrs</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Exam Target</p>
              <p className="text-base md:text-lg font-black text-accent mt-1">
                {new Date(selectedPlan.examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Adaptive Focus Breakdown Profile */}
          {selectedPlan.days && (() => {
            const breakdown = (() => {
              const data: Record<string, { totalHours: number, daysCount: number, activities: Record<string, number> }> = {};
              selectedPlan.days.forEach((day: any) => {
                day.activities.forEach((act: any) => {
                  if (!data[act.topic]) {
                    data[act.topic] = { totalHours: 0, daysCount: 0, activities: {} };
                  }
                  data[act.topic].totalHours += act.hours;
                  data[act.topic].daysCount += 1;
                  data[act.topic].activities[act.activityType] = (data[act.topic].activities[act.activityType] || 0) + 1;
                });
              });
              return Object.entries(data).map(([topic, stats]) => {
                const domActivity = Object.entries(stats.activities).sort((a, b) => b[1] - a[1])[0]?.[0] || 'study';
                return {
                  topic,
                  totalHours: stats.totalHours,
                  avgDaily: stats.totalHours / stats.daysCount,
                  domActivity
                };
              }).sort((a, b) => b.totalHours - a.totalHours);
            })();

            const maxHours = Math.max(...breakdown.map(b => b.totalHours), 1);

            return (
              <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    📊 Adaptive Focus & Mastery Analysis
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Calculated from assessment diagnostics</span>
                </div>
                
                <div className="space-y-4">
                  {breakdown.map((item, idx) => {
                    // Focus tier logic based on relative hours
                    const ratio = item.totalHours / maxHours;
                    const focusText = ratio > 0.7 ? "🔥 High Focus" : ratio > 0.3 ? "⚡ Medium Focus" : "✓ Maintain";
                    const focusColor = 
                      ratio > 0.7 ? "text-red-400 border-red-500/20 bg-red-500/5" : 
                      ratio > 0.3 ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : 
                      "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";

                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-850 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-200 truncate block">{item.topic}</span>
                          </div>
                          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${focusColor}`}>
                            {focusText}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Total preparation allocation:</span>
                          <span className="text-slate-300 font-bold">{item.totalHours.toFixed(1)} hours ({item.avgDaily.toFixed(1)} hr/day)</span>
                        </div>

                        <div className="h-1 rounded-full bg-slate-950 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              ratio > 0.7 ? 'bg-red-500' : ratio > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Calendar timeline roadmap */}
          {selectedPlan.days && <StudyCalendar days={selectedPlan.days} examDate={selectedPlan.examDate} />}
        </div>
      ) : createStep === 'form' ? (
        /* Create Plan Step 1: Form */
        <div className="max-w-xl mx-auto glass-panel border border-slate-800/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCreateStep('none')}
              className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold text-slate-250 font-display">Step 1: Plan Details</h2>
          </div>

          <form onSubmit={handleGenerateDiagnostic} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Name / Exam Target</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm AI Exam Prep"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-primary text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Target Date</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Study limit (hours)</label>
                <select
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 8].map(h => (
                    <option key={h} value={h}>{h} Hours per day</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reference material (Optional)</label>
              <select
                value={selectedPdfId}
                onChange={(e) => setSelectedPdfId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:border-primary text-sm font-medium"
              >
                <option value="">No PDF — General knowledge</option>
                {pdfs.map((pdf) => (
                  <option key={pdf.id} value={pdf.id}>{pdf.filename}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syllabus Topics (comma-separated)</label>
              <textarea
                required
                rows={3}
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                placeholder="e.g. Backpropagation, Reciprocal Rank Fusion, BM25 retrieval, Dense Embeddings"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-primary text-sm font-medium leading-relaxed"
              />
              <span className="text-[10px] text-slate-500 font-medium">Topics will be validated by AI. Irrelevant topics will be removed.</span>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? 'Validating Topics...' : 'Validate & Generate Diagnostic Quiz'}
              {!creating && <BrainCircuit className="w-4 h-4" />}
            </button>
          </form>
        </div>
      ) : createStep === 'diagnostic' && diagnosticData ? (
        /* Create Plan Step 2: Diagnostic Assessment */
        <div className="max-w-2xl mx-auto glass-panel border border-slate-800/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCreateStep('form')}
              className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold text-slate-250 font-display">Step 2: Diagnostic Assessment</h2>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-slate-300">
            <p className="font-semibold text-primary mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> AI Validated Topics:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {diagnosticData.validated_topics.map((t, idx) => (
                <span key={idx} className="px-2 py-1 bg-slate-900 rounded border border-slate-700 text-xs">{t}</span>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Answer the following {diagnosticData.quiz.length} questions. Your timeline and daily activities will be dynamically scheduled based on your current mastery of these topics.
            </p>
          </div>

          <div className="space-y-8">
            {diagnosticData.quiz.map((q, idx) => (
              <div key={idx} className="space-y-3">
                <p className="font-semibold text-slate-200 text-sm">
                  <span className="text-primary mr-2">{idx + 1}.</span> {q.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt: string, optIdx: number) => {
                    // Extract letter (A/B/C/D) from full option text e.g. "A) Something" → "A"
                    const letterMatch = opt.match(/^([A-D])[).:\s]/i);
                    const optLetter = letterMatch ? letterMatch[1].toUpperCase() : opt;
                    const isSelected = quizAnswers[idx] === optLetter;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => setQuizAnswers(prev => ({ ...prev, [idx]: optLetter }))}
                        className={`p-3 rounded-xl border text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Live score preview */}
          {Object.keys(quizAnswers).length > 0 && (() => {
            const topicStats: Record<string, { correct: number, total: number }> = {};
            diagnosticData.validated_topics.forEach(t => { topicStats[t.toLowerCase().trim()] = { correct: 0, total: 0 }; });
            diagnosticData.quiz.forEach((q: any, i: number) => {
              const qTopic = (q.topic || '').toLowerCase().trim();
              if (qTopic && topicStats[qTopic]) {
                topicStats[qTopic].total++;
                const userAns = (quizAnswers[i] || '').trim().toUpperCase();
                const correctAns = (q.answer || '').trim().toUpperCase();
                if (userAns === correctAns) topicStats[qTopic].correct++;
              }
            });
            const hasAll = Object.keys(quizAnswers).length >= diagnosticData.quiz.length;
            if (!hasAll) return null;
            return (
              <div className="mt-6 space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">📊 Your Assessment Results</p>
                {diagnosticData.validated_topics.map((t: string) => {
                  const stats = topicStats[t.toLowerCase().trim()];
                  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                  const isWeak = pct < 50;
                  return (
                    <div key={t} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${isWeak ? 'text-red-400' : 'text-emerald-400'}`}>
                          {t} {isWeak ? '⚠️ Needs Work' : '✓ Good'}
                        </span>
                        <span className="text-slate-400 font-mono">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isWeak ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-slate-500 pt-1">Topics marked ⚠️ will receive significantly more study time in your personalized plan.</p>
              </div>
            );
          })()}

          <button
            onClick={handleGeneratePlan}
            disabled={creating}
            className="w-full mt-8 py-3.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? 'Building dynamic schedule...' : 'Submit Assessment & Generate Plan'}
            {!creating && <Sparkles className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        /* List Plans Layout */
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Study Plans</h2>
            <button 
              onClick={() => setCreateStep('form')}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10"
            >
              <Plus className="w-4 h-4" />
              <span>Create Plan</span>
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm font-medium border border-dashed border-slate-850 rounded-2xl">
              You haven't generated any study calendar plans. Click "Create Plan" to begin!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {plans.map((plan) => {
                return (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="glass-panel border border-slate-800/40 rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer hover:border-primary/25 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 text-slate-400">
                        <Calendar className="w-5.5 h-5.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-200 truncate">{plan.title}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Exam Date: {new Date(plan.examDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3.5 border-t border-slate-850/50 text-[10px] font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-accent" /> {plan.totalHours} study hours
                      </span>
                      <span className="text-primary font-bold hover:underline">Open Roadmap →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
