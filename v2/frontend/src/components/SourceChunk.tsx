import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface SourceChunkProps {
  text: string;
  metadata: {
    page_number?: number;
    source?: string;
  };
  score?: number;
}

export const SourceChunk = ({ text, metadata, score }: SourceChunkProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Convert cosine similarity score to a percentage if it exists
  const matchPercentage = score != null ? Math.round(score * 100) : null;

  return (
    <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/20">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-300 truncate">
            {metadata.source || 'Document Reference'} (Page {metadata.page_number || 'N/A'})
          </span>
        </div>
        <div className="flex items-center gap-3">
          {matchPercentage != null && (
            <span className="text-[10px] font-mono font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">
              {matchPercentage}% Match
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Snippet body */}
      {isOpen && (
        <div className="p-4 border-t border-slate-800/40 bg-slate-950/40 text-xs md:text-sm text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
};
