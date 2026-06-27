import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { studyApi } from '../api/study';
import { pdfsApi } from '../api/pdfs';
import { useUIStore } from '../store/uiStore';
import { useStudyStore } from '../store/studyStore';
import { QuizQuestion } from '../components/QuizQuestion';
import { SourceChunk } from '../components/SourceChunk';
import { renderMarkdown } from '../utils/markdown';
import { 
  Sparkles, 
  BookOpen, 
  Layers, 
  Award, 
  HelpCircle,
  FileText,
  AlertCircle
} from 'lucide-react';

interface PDFDoc {
  id: string;
  filename: string;
  status: string;
}

export const Study = () => {
  const store = useStudyStore();
  
  const [pdfs, setPdfs] = useState<PDFDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'qa'>('summary');
  const [quizTimeSpent, setQuizTimeSpent] = useState<number>(0);

  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadPdfs = async () => {
      try {
        const data = await pdfsApi.list();
        setPdfs(data.filter((p: any) => p.status === 'INDEXED'));
      } catch (e) {
        // soft fail
      }
    };
    loadPdfs();
  }, []);

  useEffect(() => {
    if (location.state?.pdfId) {
      store.setSessionParams({ pdfCollection: location.state.pdfId });
    }
  }, [location.state]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.topic.trim()) return;

    setLoading(true);
    store.setQuizState({ quizFinished: false, quizCurrentIndex: 0, quizScores: [] });
    setQuizTimeSpent(0);

    try {
      const data = await studyApi.generateStudyContent({
        topic: store.topic,
        pdfId: store.pdfCollection ? store.pdfCollection : null,
        numFlashcards: store.questionCount, // fallback
        difficulty: store.difficulty,
        questionCount: store.questionCount,
        questionType: store.questionType,
      });

      store.setSessionData({
        summary: data.summary || 'No summary returned.',
        answer: data.answer || 'No Q&A content returned.',
        quiz: data.quiz || [],
        deckId: data.deckId || '',
        retrievedChunks: data.retrievedChunks || [],
      });

      showToast('Study materials generated successfully!', 'success');
      setActiveTab('summary');
    } catch (err) {
      showToast('Failed to generate study materials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizQuestionNext = async (answerVal: string, timeTaken: number) => {
    const currentQ = store.quiz[store.quizCurrentIndex];
    const newTimeSpent = quizTimeSpent + timeTaken;
    setQuizTimeSpent(newTimeSpent);

    // Score comparison
    const isCorrect = currentQ.answer.trim().toUpperCase() === answerVal.trim().toUpperCase();
    const newScores = [...store.quizScores, isCorrect ? 1 : 0];
    store.setQuizState({ quizScores: newScores });

    if (store.quizCurrentIndex + 1 >= store.quiz.length) {
      // Quiz complete -> Save score in DB
      store.setQuizState({ quizFinished: true });
      const totalScore = newScores.reduce((a, b) => a + b, 0);
      try {
        await studyApi.submitQuizScore({
          topic: store.topic,
          score: totalScore,
          total: store.quiz.length,
          difficulty: store.difficulty,
          type: store.questionType,
          pdfId: store.pdfCollection ? store.pdfCollection : null,
          timeSpentSeconds: newTimeSpent,
        });
        showToast('Quiz attempt saved!', 'success');
      } catch (e) {
        showToast('Failed to save quiz attempt', 'error');
      }
    } else {
      store.setQuizState({ quizCurrentIndex: store.quizCurrentIndex + 1 });
    }
  };

  const tabs = [
    { id: 'summary', name: 'Text Summary', icon: BookOpen },
    { id: 'flashcards', name: 'Flashcards', icon: Layers },
    { id: 'quiz', name: 'Interactive Quiz', icon: Award },
    { id: 'qa', name: 'Direct Q&A', icon: HelpCircle },
  ] as const;

  const totalScoreCalc = store.quizScores.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Parameter input panel */}
      {!store.hasSession ? (
        <div className="w-full max-w-xl mx-auto glass-panel border border-slate-800/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">StudyCopilot AI</h1>
            <p className="text-slate-500 text-xs font-medium">Generate matching summaries, flashcards, and quizzes in parallel</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Focus Topic / Keyword</label>
              <input
                type="text"
                required
                value={store.topic}
                onChange={(e) => store.setSessionParams({ topic: e.target.value })}
                placeholder="e.g. Reciprocal Rank Fusion, Backpropagation"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-primary text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Context Source</label>
              <select
                value={store.pdfCollection}
                onChange={(e) => store.setSessionParams({ pdfCollection: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:border-primary text-sm font-medium"
              >
                <option value="">No PDF — Generate from general knowledge</option>
                {pdfs.map((pdf) => (
                  <option key={pdf.id} value={pdf.id}>{pdf.filename}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
                <select
                  value={store.difficulty}
                  onChange={(e) => store.setSessionParams({ difficulty: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Questions</label>
                <select
                  value={store.questionCount}
                  onChange={(e) => store.setSessionParams({ questionCount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-primary"
                >
                  <option value={3}>3 Items</option>
                  <option value={5}>5 Items</option>
                  <option value={10}>10 Items</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quiz Format</label>
                <select
                  value={store.questionType}
                  onChange={(e) => store.setSessionParams({ questionType: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="mcq">MCQ</option>
                  <option value="true_false">T / F</option>
                  <option value="fill_blank">Fill Blank</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Synthesizing Materials...' : 'Generate Study Bundle'}
            </button>
          </form>
        </div>
      ) : (
        /* Materials Results Display */
        <div className="space-y-6 animate-fade-in">
          {/* Header info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 glass-panel rounded-2xl border border-slate-800/40">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Active Study Session</span>
              <h2 className="text-xl font-bold text-slate-200 mt-0.5">{store.topic}</h2>
            </div>
            <button
              onClick={() => store.clearSession()}
              className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-bold transition-all"
            >
              Start New Session
            </button>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-slate-800/60 overflow-x-auto gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                    isActive 
                      ? 'border-primary text-primary font-bold bg-primary/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content containers */}
          <div className="min-h-96">
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 md:p-8 space-y-4">
                  <h3 className="text-lg font-bold text-slate-250 font-display">Text Summary</h3>
                  <div 
                    className="text-slate-350 text-sm md:text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(store.summary) }}
                  />
                </div>

                {/* Retrieved source citations */}
                {store.retrievedChunks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vector Citations & References</h4>
                    {store.retrievedChunks.map((c, i) => (
                      <SourceChunk key={i} text={c.text} metadata={c.metadata} score={c.score} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div className="glass-panel border border-slate-800/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4">
                <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-full">
                  <Layers className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-200 font-display">Flashcards Deck Synthesized!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                    A spaced-repetition flashcard deck has been created in your profile. You can start studying it with the SM-2 algorithm.
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/flashcards/${store.deckId}`)}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all"
                >
                  Study flashcards now
                </button>
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="max-w-xl mx-auto">
                {store.quiz.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No quiz questions generated for this topic.
                  </div>
                ) : store.quizFinished ? (
                  <div className="space-y-6">
                    {/* Score Banner */}
                    <div className="glass-panel border border-slate-800/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
                      <div className={`p-4 rounded-full border ${totalScoreCalc / store.quiz.length >= 0.7 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                        <Award className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-200 font-display">Quiz Complete!</h3>
                        <p className="text-3xl font-black text-emerald-400 mt-2">
                          {totalScoreCalc} / {store.quiz.length}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {Math.round((totalScoreCalc / store.quiz.length) * 100)}% accuracy
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          store.setQuizState({ quizFinished: false, quizCurrentIndex: 0, quizScores: [] });
                          setQuizTimeSpent(0);
                        }}
                        className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all"
                      >
                        Retake Quiz
                      </button>
                    </div>

                    {/* Wrong Answer Review */}
                    {store.quizScores.some((s) => s === 0) && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400" /> Revision — Questions You Missed
                        </h4>
                        {store.quiz.map((q, i) => {
                          if (store.quizScores[i] !== 0) return null;
                          return (
                            <div key={i} className="glass-panel border border-red-500/15 rounded-2xl p-5 space-y-3">
                              <p className="text-sm font-semibold text-slate-200">
                                <span className="text-red-400 mr-2">{i + 1}.</span>{q.question}
                              </p>
                              <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                                ✓ Correct Answer: <span className="font-bold">{q.answer}</span>
                              </div>
                              {q.explanation && (
                                <div className="text-xs leading-relaxed text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                  💡 {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <QuizQuestion
                    question={store.quiz[store.quizCurrentIndex]}
                    questionNumber={store.quizCurrentIndex + 1}
                    totalQuestions={store.quiz.length}
                    onNext={handleQuizQuestionNext}
                  />
                )}
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="glass-panel border border-slate-800/40 rounded-2xl p-6 md:p-8 space-y-4">
                <h3 className="text-lg font-bold text-slate-250 font-display">Direct Q&A response</h3>
                <div 
                  className="text-slate-350 text-sm md:text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(store.answer) }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
