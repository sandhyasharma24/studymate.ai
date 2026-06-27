import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { studyApi } from '../api/study';
import { useFlashcardReview } from '../hooks/useFlashcardReview';
import { useUIStore } from '../store/uiStore';
import { FlashCard } from '../components/FlashCard';
import { 
  Layers, 
  ChevronLeft, 
  Download, 
  Sparkles, 
  Award,
  Loader2,
  Calendar
} from 'lucide-react';

interface Deck {
  id: string;
  name: string;
  pdf?: {
    filename: string;
  };
}

export const Flashcards = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [exportingAnki, setExportingAnki] = useState(false);
  const { showToast } = useUIStore();
  const navigate = useNavigate();

  // Instantiate spaced repetition hooks
  const reviewState = useFlashcardReview(deckId || '');

  const loadDecksList = async () => {
    try {
      const data = await studyApi.listDecks();
      setDecks(data);
    } catch (e) {
      showToast('Failed to load flashcard decks', 'error');
    } finally {
      setLoadingDecks(false);
    }
  };

  useEffect(() => {
    if (!deckId) {
      loadDecksList();
    } else {
      reviewState.loadCards(true); // Load due cards by default
    }
  }, [deckId]);

  const handleExportAnki = async () => {
    if (!deckId) return;
    setExportingAnki(true);
    try {
      const data = await studyApi.exportAnki(deckId);
      const byteCharacters = atob(data.apkg_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'deck.apkg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Anki package downloaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to export Anki package', 'error');
    } finally {
      setExportingAnki(false);
    }
  };

  if (deckId) {
    // Review session layout
    const activeDeckName = decks.find(d => d.id === deckId)?.name || 'Study Deck';

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between gap-4 p-5 glass-panel rounded-2xl border border-slate-800/40">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Active Deck Review</span>
              <h2 className="text-lg font-bold text-slate-200 mt-0.5 truncate max-w-sm md:max-w-md">{activeDeckName}</h2>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportAnki}
              disabled={exportingAnki}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-350 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
            >
              {exportingAnki ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export Anki</span>
            </button>
          </div>
        </div>

        {/* Due check vs finished check vs card study */}
        {reviewState.loading ? (
          <div className="flex h-80 items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : reviewState.cards.length === 0 ? (
          <div className="glass-panel border border-slate-800/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto shadow-2xl">
            <div className="p-4 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 rounded-full">
              <Layers className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-200 font-display">No reviews due!</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                You've completed all scheduled spaced-repetition card reviews in this deck. You can check back tomorrow.
              </p>
            </div>
            <button
              onClick={() => reviewState.loadCards(false)} // Load all cards
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all"
            >
              Force study all cards
            </button>
          </div>
        ) : reviewState.isFinished ? (
          <div className="glass-panel border border-slate-800/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto shadow-2xl">
            <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              <Award className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-200 font-display">Deck Reviews Finished!</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                Excellent! The next review intervals have been recorded and saved. Return tomorrow to build permanent recall.
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all"
            >
              Go Back
            </button>
          </div>
        ) : (
          reviewState.currentCard && (
            <FlashCard
              question={reviewState.currentCard.question}
              answer={reviewState.currentCard.answer}
              onQualitySubmit={reviewState.submitScore}
              showAnswer={reviewState.showAnswer}
              setShowAnswer={reviewState.setShowAnswer}
            />
          )
        )}
      </div>
    );
  }

  // Decks list layout
  if (loadingDecks) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Flashcard Decks</h2>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm font-medium border border-dashed border-slate-850 rounded-2xl">
          You don't have any flashcard decks. You can generate them by running a Copilot session!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.map((deck) => (
            <div 
              key={deck.id}
              onClick={() => navigate(`/flashcards/${deck.id}`)}
              className="glass-panel border border-slate-800/40 rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer hover:border-accent/25 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 text-slate-400">
                  <Layers className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-200 truncate">{deck.name}</p>
                  {deck.pdf && (
                    <p className="text-[10px] text-accent font-semibold truncate mt-1">
                      📄 {deck.pdf.filename}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3.5 border-t border-slate-850/50 text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Spaced repetition
                </span>
                <span className="text-accent font-bold hover:underline">Start review →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
