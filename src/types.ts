export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation?: string;
}

export interface QuizState {
  examName: string;
  sections: string[];
  sources: { title: string; uri: string }[];
  selectedSection: string | null;
  questionCount: number;
  timeRemaining: number; // in seconds
  isTimerRunning: boolean;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answers: (number | null)[];
  status: 'idle' | 'fetching_sections' | 'selecting_section' | 'generating' | 'active' | 'completed';
  error?: string;
}
