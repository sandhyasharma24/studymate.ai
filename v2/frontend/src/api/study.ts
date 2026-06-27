import { apiClient } from './client';

export const studyApi = {
  // Parallel material generation
  generateStudyContent: async (payload: {
    topic: string;
    pdfId?: string | null;
    numFlashcards?: number;
    difficulty?: string;
    questionCount?: number;
    questionType?: string;
  }) => {
    const response = await apiClient.post('/study/generate', payload);
    return response.data;
  },

  // Flashcards
  listDecks: async () => {
    const response = await apiClient.get('/study/flashcards/decks');
    return response.data;
  },
  getDeckDetails: async (deckId: string) => {
    const response = await apiClient.get(`/study/flashcards/decks/${deckId}`);
    return response.data;
  },
  getDeckCards: async (deckId: string) => {
    const response = await apiClient.get(`/study/flashcards/decks/${deckId}/cards`);
    return response.data;
  },
  getDueCards: async (deckId: string) => {
    const response = await apiClient.get(`/study/flashcards/decks/${deckId}/due`);
    return response.data;
  },
  submitCardReview: async (deckId: string, cardId: string, quality: number) => {
    const response = await apiClient.post(`/study/flashcards/decks/${deckId}/review`, { cardId, quality });
    return response.data;
  },
  exportAnki: async (deckId: string) => {
    const response = await apiClient.post(`/study/flashcards/decks/${deckId}/export/anki`);
    return response.data;
  },

  // Quizzes
  listAttempts: async () => {
    const response = await apiClient.get('/study/quizzes/attempts');
    return response.data;
  },
  generateQuizOnly: async (payload: {
    topic: string;
    count?: number;
    difficulty?: string;
    type?: string;
    pdfId?: string | null;
  }) => {
    const response = await apiClient.post('/study/quizzes', payload);
    return response.data;
  },
  submitQuizScore: async (payload: {
    topic: string;
    score: number;
    total: number;
    difficulty: string;
    type: string;
    pdfId?: string | null;
    timeSpentSeconds?: number;
  }) => {
    const response = await apiClient.post('/study/quizzes/submit', payload);
    return response.data;
  },

  // Study Plans
  listPlans: async () => {
    const response = await apiClient.get('/study/plans');
    return response.data;
  },
  getPlan: async (planId: string) => {
    const response = await apiClient.get(`/study/plans/${planId}`);
    return response.data;
  },
  generateDiagnostic: async (payload: { topics: string[]; pdfCollection?: string }) => {
    const response = await apiClient.post('/study/plans/diagnostic', payload);
    return response.data;
  },
  createPlan: async (payload: {
    title: string;
    examDate: string;
    topics: string[];
    hoursPerDay: number;
    masteryLevels: Record<string, number>;
    pdfCollection?: string;
  }) => {
    const response = await apiClient.post('/study/plans', payload);
    return response.data;
  },
  deletePlan: async (planId: string) => {
    const response = await apiClient.delete(`/study/plans/${planId}`);
    return response.data;
  },
};
