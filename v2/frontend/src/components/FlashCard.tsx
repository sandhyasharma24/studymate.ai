import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface FlashCardProps {
  question: string;
  answer: string;
  onQualitySubmit: (quality: number) => void;
  showAnswer: boolean;
  setShowAnswer: (show: boolean) => void;
}

export const FlashCard = ({ question, answer, onQualitySubmit, showAnswer, setShowAnswer }: FlashCardProps) => {
  return (
    <div className="flex flex-col items-center gap-8 max-w-xl w-full mx-auto">
      {/* 3D Card Container */}
      <div 
        className="w-full h-80 perspective-1000 cursor-pointer"
        onClick={() => setShowAnswer(!showAnswer)}
      >
        <div 
          className={`relative w-full h-full duration-500 transform-style-3d ${
            showAnswer ? 'rotate-y-180' : ''
          }`}
        >
          {/* Card Front */}
          <div className="absolute inset-0 w-full h-full rounded-2xl glass-panel p-8 flex flex-col justify-between backface-hidden border border-slate-700/40">
            <div className="flex justify-between items-center text-xs font-mono text-primary font-bold uppercase tracking-wider">
              <span>Question</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xl font-medium text-slate-200 text-center leading-relaxed">
              {question}
            </div>
            <div className="text-xs text-center text-slate-500 font-mono">
              Click card to reveal answer
            </div>
          </div>

          {/* Card Back */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-slate-900 border border-primary/20 p-8 flex flex-col justify-between backface-hidden rotate-y-180">
            <div className="flex justify-between items-center text-xs font-mono text-accent font-bold uppercase tracking-wider">
              <span>Answer</span>
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="text-lg text-slate-300 text-center overflow-y-auto max-h-48 leading-relaxed">
              {answer}
            </div>
            <div className="text-xs text-center text-slate-500 font-mono">
              Click card to view question again
            </div>
          </div>
        </div>
      </div>

      {/* Quality evaluation buttons (displayed only when answer is visible) */}
      {showAnswer && (
        <div className="w-full animate-fade-in space-y-4">
          <p className="text-sm text-center text-slate-400 font-medium">How well did you recall this card?</p>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((val) => {
              const colors = [
                'bg-red-500/10 hover:bg-red-500/30 text-red-400 border-red-500/30', // 0
                'bg-orange-500/10 hover:bg-orange-500/30 text-orange-400 border-orange-500/30', // 1
                'bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 border-amber-500/30', // 2
                'bg-yellow-500/10 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30', // 3
                'bg-lime-500/10 hover:bg-lime-500/30 text-lime-400 border-lime-500/30', // 4
                'bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30' // 5
              ];
              return (
                <button
                  key={val}
                  onClick={(e) => {
                    e.stopPropagation();
                    onQualitySubmit(val);
                  }}
                  className={`py-2.5 rounded-xl border text-sm font-bold transition-all duration-200 ${colors[val]}`}
                  title={`Score: ${val}`}
                >
                  {val}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
            <span>Forgot completely</span>
            <span>Perfect recall</span>
          </div>
        </div>
      )}
    </div>
  );
};
