import { create } from 'zustand';

interface StudyState {
  hasSession: boolean;
  topic: string;
  pdfCollection: string;
  difficulty: string;
  questionCount: number;
  questionType: string;
  
  summary: string;
  flashcards: any[];
  quiz: any[];
  answer: string;
  retrievedChunks: any[];
  deckId: string | null;
  
  quizCurrentIndex: number;
  quizScores: number[];
  quizFinished: boolean;

  setSessionParams: (params: Partial<StudyState>) => void;
  setSessionData: (data: Partial<StudyState>) => void;
  clearSession: () => void;
  setQuizState: (state: Partial<StudyState>) => void;
}

const initialState = {
  hasSession: false,
  topic: '',
  pdfCollection: '',
  difficulty: 'medium',
  questionCount: 5,
  questionType: 'mcq',
  summary: '',
  flashcards: [],
  quiz: [],
  answer: '',
  retrievedChunks: [],
  deckId: null,
  quizCurrentIndex: 0,
  quizScores: [],
  quizFinished: false,
};

export const useStudyStore = create<StudyState>((set) => ({
  ...initialState,
  
  setSessionParams: (params) => set((state) => ({ ...state, ...params })),
  
  setSessionData: (data) => set((state) => ({
    ...state,
    ...data,
    hasSession: true
  })),
  
  clearSession: () => set(initialState),
  
  setQuizState: (stateUpdate) => set((state) => ({ ...state, ...stateUpdate }))
}));
