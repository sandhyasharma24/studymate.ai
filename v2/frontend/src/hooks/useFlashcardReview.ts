import { useState } from 'react';
import { studyApi } from '../api/study';
import { useUIStore } from '../store/uiStore';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number;
  status: string;
}

export const useFlashcardReview = (deckId: string) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const { showToast } = useUIStore();

  const loadCards = async (onlyDue: boolean = true) => {
    setLoading(true);
    try {
      const data = onlyDue 
        ? await studyApi.getDueCards(deckId)
        : await studyApi.getDeckCards(deckId);
      setCards(data);
      setCurrentIndex(0);
      setShowAnswer(false);
    } catch (err) {
      showToast('Failed to load flashcards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitScore = async (quality: number) => {
    if (cards.length === 0) return;
    
    const card = cards[currentIndex];
    try {
      await studyApi.submitCardReview(deckId, card.id, quality);
      showToast(`Review submitted (Score: ${quality}/5)`, 'success');
      
      // Advance to next card
      setShowAnswer(false);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      showToast('Failed to submit review', 'error');
    }
  };

  const currentCard = currentIndex < cards.length ? cards[currentIndex] : null;
  const isFinished = cards.length > 0 && currentIndex >= cards.length;

  return {
    cards,
    currentIndex,
    currentCard,
    isFinished,
    loading,
    showAnswer,
    setShowAnswer,
    loadCards,
    submitScore,
  };
};
