import { BookOpen, User } from 'lucide-react';
import { renderMarkdown } from '../utils/markdown';

interface ChatMessageProps {
  role: 'USER' | 'ASSISTANT' | string;
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming }: ChatMessageProps) => {
  const isUser = role.toUpperCase() === 'USER';

  return (
    <div className={`flex gap-4 p-5 rounded-2xl border transition-all ${
      isUser 
        ? 'bg-slate-900/40 border-slate-800/60 ml-12' 
        : 'bg-gradient-to-r from-slate-900/80 to-slate-900/60 border-primary/10 mr-12'
    }`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-between justify-center flex-shrink-0 ${
        isUser ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
      }`}>
        {isUser ? (
          <User className="w-4.5 h-4.5 mx-auto" />
        ) : (
          <BookOpen className="w-4.5 h-4.5 mx-auto" />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
          {isUser ? 'You' : 'StudyMate AI'}
        </div>
        <div 
          className={`text-sm md:text-base leading-relaxed text-slate-250 ${
            isStreaming && !isUser ? 'typing-cursor' : ''
          }`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
    </div>
  );
};
