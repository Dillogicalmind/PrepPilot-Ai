import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  RotateCcw, 
  Trophy, 
  Loader2, 
  AlertCircle,
  BrainCircuit,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  Timer,
  Pause,
  Play
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Question, QuizState } from './types';
import { generateQuestions, getExamSections } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [state, setState] = useState<QuizState>({
    examName: '',
    sections: [],
    sources: [],
    selectedSection: null,
    questionCount: 5,
    timeRemaining: 0,
    isTimerRunning: false,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    status: 'idle',
  });

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.status === 'active' && state.isTimerRunning && state.timeRemaining > 0) {
      interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
    } else if (state.timeRemaining === 0 && state.status === 'active') {
      setState(prev => ({ ...prev, status: 'completed', isTimerRunning: false }));
    }
    return () => clearInterval(interval);
  }, [state.status, state.isTimerRunning, state.timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFetchSections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.examName.trim()) return;

    setState(prev => ({ ...prev, status: 'fetching_sections', error: undefined }));
    
    try {
      const syllabus = await getExamSections(state.examName);
      setState(prev => ({
        ...prev,
        sections: syllabus.sections,
        sources: syllabus.sources,
        status: 'selecting_section',
      }));
    } catch (error: any) {
      setState(prev => ({ ...prev, status: 'idle', error: error.message }));
    }
  };

  const handleGenerateQuestions = async () => {
    if (!state.selectedSection) return;

    setState(prev => ({ ...prev, status: 'generating', error: undefined }));
    
    try {
      const questions = await generateQuestions(state.examName, state.questionCount, state.selectedSection);
      setState(prev => ({
        ...prev,
        questions,
        status: 'active',
        currentQuestionIndex: 0,
        score: 0,
        timeRemaining: state.questionCount * 60, // 1 minute per question
        isTimerRunning: true,
        answers: new Array(questions.length).fill(null),
      }));
    } catch (error: any) {
      setState(prev => ({ ...prev, status: 'selecting_section', error: error.message }));
    }
  };

  const handleAnswerSubmit = () => {
    if (selectedOption === null || isAnswered) return;

    const currentQuestion = state.questions[state.currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    setIsAnswered(true);
    
    setState(prev => {
      const newAnswers = [...prev.answers];
      newAnswers[prev.currentQuestionIndex] = selectedOption;
      return {
        ...prev,
        score: isCorrect ? prev.score + 1 : prev.score,
        answers: newAnswers,
      };
    });
  };

  const handleNextQuestion = () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setState(prev => ({ ...prev, status: 'completed' }));
    }
  };

  const resetQuiz = () => {
    setState({
      examName: '',
      sections: [],
      sources: [],
      selectedSection: null,
      questionCount: 5,
      timeRemaining: 0,
      isTimerRunning: false,
      questions: [],
      currentQuestionIndex: 0,
      score: 0,
      answers: [],
      status: 'idle',
    });
    setSelectedOption(null);
    setIsAnswered(false);
  };

  // Renderers
  const renderSetup = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto p-10 glass rounded-[2.5rem]"
    >
      <div className="flex items-center justify-center mb-10">
        <div className="p-4 bg-indigo-500 rounded-3xl shadow-2xl shadow-indigo-500/20 relative group">
          <div className="absolute inset-0 bg-indigo-400 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <BrainCircuit className="w-10 h-10 text-white relative z-10" />
        </div>
      </div>
      
      <h1 className="text-4xl font-display font-bold text-center text-zinc-900 mb-3 tracking-tight">PrepPilot AI</h1>
      <p className="text-zinc-500 text-center mb-10 font-medium">Your intelligent exam companion</p>

      {state.status === 'idle' ? (
        <form onSubmit={handleFetchSections} className="space-y-8">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Exam Name</label>
            <input
              type="text"
              required
              placeholder="e.g. CC isc2, AWS Cloud Practitioner"
              className="w-full px-5 py-4 rounded-2xl bg-white/40 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              value={state.examName}
              onChange={e => setState(prev => ({ ...prev, examName: e.target.value }))}
            />
          </div>

          {state.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{state.error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group"
          >
            Fetch Syllabus Sections
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Select Section</label>
              {state.sources.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Syllabus
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
              {state.sections.map(section => (
                <button
                  key={section}
                  onClick={() => setState(prev => ({ ...prev, selectedSection: section }))}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all border text-left flex items-center justify-between group",
                    state.selectedSection === section 
                      ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                      : "bg-white/40 border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:bg-white/60"
                  )}
                >
                  <span className="truncate">{section}</span>
                  {state.selectedSection === section && (
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {state.sources.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Official Sources Found</label>
              <div className="flex flex-wrap gap-2">
                {state.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/40 border border-zinc-200 text-[10px] text-zinc-500 hover:text-indigo-600 hover:bg-white/60 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Number of Questions</label>
            <div className="grid grid-cols-4 gap-3">
              {[5, 10, 20, 50].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setState(prev => ({ ...prev, questionCount: count }))}
                  className={cn(
                    "py-3 rounded-xl text-sm font-bold transition-all border",
                    state.questionCount === count 
                      ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                      : "bg-white/40 border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:bg-white/60"
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {state.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{state.error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setState(prev => ({ ...prev, status: 'idle', selectedSection: null }))}
              className="flex-1 py-5 bg-white/40 hover:bg-white/60 text-zinc-900 font-bold rounded-2xl transition-all border border-zinc-200"
            >
              Back
            </button>
            <button
              disabled={!state.selectedSection}
              onClick={handleGenerateQuestions}
              className="flex-[2] py-5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group"
            >
              Start Mock Test
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderFetchingSections = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-28 h-28 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BookOpen className="w-10 h-10 text-indigo-500" />
          </motion.div>
        </div>
      </div>
      <h2 className="mt-10 text-2xl font-display font-bold text-zinc-900 tracking-tight">Analyzing Syllabus...</h2>
      <p className="text-zinc-600 mt-3 font-medium">Gemini is identifying the core sections for {state.examName}.</p>
    </div>
  );

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-28 h-28 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BrainCircuit className="w-10 h-10 text-indigo-500" />
          </motion.div>
        </div>
      </div>
      <h2 className="mt-10 text-2xl font-display font-bold text-zinc-900 tracking-tight">Generating Questions...</h2>
      <p className="text-zinc-600 mt-3 font-medium">Gemini is crafting your custom {state.examName} test.</p>
    </div>
  );

  const renderQuiz = () => {
    const question = state.questions[state.currentQuestionIndex];
    const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;

    return (
      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mb-1">{state.examName}</h2>
              <p className="text-zinc-600 text-sm font-bold">Question {state.currentQuestionIndex + 1} <span className="text-zinc-300 mx-1">/</span> {state.questions.length}</p>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 glass rounded-xl border-zinc-200">
              <Timer className={cn("w-4 h-4", state.timeRemaining < 60 ? "text-red-500 animate-pulse" : "text-indigo-600")} />
              <span className={cn("text-sm font-mono font-bold", state.timeRemaining < 60 ? "text-red-500" : "text-zinc-900")}>
                {formatTime(state.timeRemaining)}
              </span>
              <div className="h-4 w-px bg-zinc-200 mx-1" />
              <button 
                onClick={() => setState(prev => ({ ...prev, isTimerRunning: !prev.isTimerRunning }))}
                className="hover:text-indigo-600 text-zinc-400 transition-colors"
              >
                {state.isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="px-4 py-2 glass rounded-xl border-zinc-200">
            <span className="text-sm font-bold text-zinc-900">Score: <span className="text-indigo-600">{state.score}</span></span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-200 rounded-full mb-16 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.2)]"
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 md:p-8 rounded-[2rem]"
          >
            <h3 className="text-xl md:text-2xl font-display font-bold text-zinc-900 mb-6 md:mb-8 leading-tight">
              {question.text}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.options.map((option, idx) => {
                const isCorrect = idx === question.correctAnswer;
                const isSelected = selectedOption === idx;
                
                let buttonClass = "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 group relative overflow-hidden h-full";
                
                if (isAnswered) {
                  if (isCorrect) {
                    buttonClass += " border-emerald-500/50 bg-emerald-500/10 text-emerald-700";
                  } else if (isSelected) {
                    buttonClass += " border-red-500/50 bg-red-500/10 text-red-700";
                  } else {
                    buttonClass += " border-zinc-100 text-zinc-400 opacity-40";
                  }
                } else {
                  buttonClass += isSelected 
                    ? " border-indigo-500 bg-indigo-500/5 text-indigo-900 shadow-lg shadow-indigo-500/5" 
                    : " border-zinc-100 hover:border-indigo-200 text-zinc-600 hover:bg-white/60";
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => setSelectedOption(idx)}
                    className={buttonClass}
                  >
                    <span className="font-bold text-base opacity-30 shrink-0">{String.fromCharCode(65 + idx)}</span>
                    <span className="font-medium text-sm md:text-base leading-snug">{option}</span>
                    <div className="ml-auto shrink-0">
                      {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-5 bg-zinc-50 rounded-2xl border border-zinc-200 flex gap-4"
              >
                <div className="shrink-0">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Lightbulb className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-zinc-900">Explanation</p>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded-md uppercase tracking-widest border border-indigo-200">
                      Correct Answer: {String.fromCharCode(65 + question.correctAnswer)}
                    </span>
                  </div>
                  <div className="text-xs md:text-sm text-zinc-600 leading-relaxed markdown-body font-medium">
                    <Markdown>{question.explanation}</Markdown>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="mt-8 flex justify-end">
              {!isAnswered ? (
                <button
                  disabled={selectedOption === null}
                  onClick={handleAnswerSubmit}
                  className="px-8 py-3 bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-500/20 text-sm"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-8 py-3 bg-white hover:bg-zinc-100 text-zinc-950 font-bold rounded-xl transition-all shadow-xl flex items-center gap-2 group text-sm"
                >
                  {state.currentQuestionIndex === state.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    );
  };

  const renderCompleted = () => {
    const percentage = Math.round((state.score / state.questions.length) * 100);
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto p-12 glass rounded-[3rem] text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
        
        <div className="w-28 h-28 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20" />
          <Trophy className="w-14 h-14 text-indigo-500 relative z-10" />
        </div>
        
        <h2 className="text-4xl font-display font-bold text-zinc-900 mb-3 tracking-tight">Test Complete!</h2>
        <p className="text-zinc-600 mb-10 font-medium">Great job finishing the {state.examName} mock test.</p>

        <div className="grid grid-cols-2 gap-5 mb-10">
          <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-200">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Score</p>
            <p className="text-3xl font-display font-bold text-zinc-900">{state.score} <span className="text-zinc-300 text-xl">/</span> {state.questions.length}</p>
          </div>
          <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-200">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Accuracy</p>
            <p className="text-3xl font-display font-bold text-zinc-900">{percentage}%</p>
          </div>
        </div>

        <button
          onClick={resetQuiz}
          className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group"
        >
          <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          Try Another Exam
        </button>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <main className="w-full max-w-4xl">
        {(state.status === 'idle' || state.status === 'selecting_section') && renderSetup()}
        {state.status === 'fetching_sections' && renderFetchingSections()}
        {state.status === 'generating' && renderGenerating()}
        {state.status === 'active' && renderQuiz()}
        {state.status === 'completed' && renderCompleted()}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-zinc-500 text-xs font-medium flex items-center gap-2">
        <BrainCircuit className="w-4 h-4" />
        <span>Powered by Gemini AI</span>
      </footer>
    </div>
  );
}
