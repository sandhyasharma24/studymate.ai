import { useState, useEffect } from 'react';
import { Timer, CheckCircle, XCircle, Lightbulb } from 'lucide-react';

interface QuestionData {
  question: string;
  options?: string[];
  answer: string;
  type?: string; // mcq, true_false, fill_blank
  explanation?: string;
}

interface QuizQuestionProps {
  question: QuestionData;
  questionNumber: number;
  totalQuestions: number;
  onNext: (selectedAnswer: string, timeSpent: number) => void;
}

export const QuizQuestion = ({ question, questionNumber, totalQuestions, onNext }: QuizQuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [fillBlankAnswer, setFillBlankAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    setTimeLeft(60);
    setHasSubmitted(false);
    setSelectedOption('');
    setFillBlankAnswer('');
  }, [question]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOptionClick = (optionChar: string) => {
    if (hasSubmitted) return;
    setSelectedOption(optionChar);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption && !fillBlankAnswer) return;
    setHasSubmitted(true);
  };

  const handleNext = () => {
    const finalAnswer = question.options ? selectedOption : fillBlankAnswer;
    onNext(finalAnswer, 60 - timeLeft);
  };

  const isMcq = !question.type || question.type === 'mcq';
  const isTrueFalse = question.type === 'true_false';
  const isFillBlank = question.type === 'fill_blank';

  return (
    <div className="glass-panel rounded-2xl p-6 md:p-8 border border-slate-800/40 space-y-6">
      {/* Progress Bar & Timer */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-slate-400 font-medium">
          Question <span className="text-primary text-sm font-bold">{questionNumber}</span> of {totalQuestions}
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold border transition-colors ${
          timeLeft <= 10 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-slate-900/60 border-slate-800 text-slate-300'
        }`}>
          <Timer className="w-3.5 h-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-300"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Text */}
      <h3 className="text-lg md:text-xl font-bold text-slate-100 leading-relaxed font-display">
        {question.question}
      </h3>

      {/* Inputs / Options */}
      <div className="space-y-3">
        {(isMcq || isTrueFalse) && question.options && (
          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((option) => {
              // Extract option indicator e.g. "A)" or "A."
              const match = option.match(/^([A-D]|True|False)[).:\s]/i);
              const optionChar = match ? match[1].toUpperCase() : option;
              
              const isSelected = selectedOption === optionChar;
              const isCorrect = optionChar === question.answer.toUpperCase();
              
              let optionStyle = 'border-slate-800/60 bg-slate-900/30 text-slate-300 hover:bg-slate-800/30 hover:border-slate-700';
              if (isSelected && !hasSubmitted) {
                optionStyle = 'border-primary bg-primary/10 text-primary font-medium';
              } else if (hasSubmitted) {
                if (isCorrect) {
                  optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-medium';
                } else if (isSelected) {
                  optionStyle = 'border-red-500 bg-red-500/10 text-red-400 font-medium';
                } else {
                  optionStyle = 'border-slate-800/60 bg-slate-900/10 text-slate-500 opacity-60';
                }
              }

              return (
                <button
                  key={option}
                  disabled={hasSubmitted}
                  onClick={() => handleOptionClick(optionChar)}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl border text-left text-sm transition-all duration-200 ${optionStyle}`}
                >
                  <span className="leading-normal">{option}</span>
                  {hasSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                  {hasSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {isFillBlank && (
          <div className="space-y-4">
            <input
              type="text"
              disabled={hasSubmitted}
              value={fillBlankAnswer}
              onChange={(e) => setFillBlankAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary"
            />
            {hasSubmitted && (
              <div className={`p-4 rounded-xl border ${
                fillBlankAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <p className="text-sm font-semibold">
                  Correct Answer: <span className="font-mono">{question.answer}</span>
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Explanation Block */}
        {hasSubmitted && question.explanation && (
          <div className="mt-6 p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 animate-slide-in">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-300">Explanation</h4>
                <p className="text-sm leading-relaxed text-amber-200/90">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-4 border-t border-slate-800/40">
        {!hasSubmitted ? (
          <button
            disabled={(!selectedOption && isMcq) || (!selectedOption && isTrueFalse) || (!fillBlankAnswer && isFillBlank)}
            onClick={handleSubmitAnswer}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all"
          >
            {questionNumber === totalQuestions ? 'Finish Quiz' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
};
