import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { chatApi } from '../api/chat';
import { pdfsApi } from '../api/pdfs';
import { useSSE } from '../hooks/useSSE';
import { useUIStore } from '../store/uiStore';
import { ChatMessage } from '../components/ChatMessage';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  FileText,
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface Session {
  id: string;
  title: string;
  pdf?: {
    id: string;
    filename: string;
  };
}

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface PDFDoc {
  id: string;
  filename: string;
  status: string;
}

export const Chat = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [pdfs, setPdfs] = useState<PDFDoc[]>([]);
  const [selectedPdfId, setSelectedPdfId] = useState<string>('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { streamMessage, streaming } = useSSE();

  const loadSessions = async () => {
    try {
      const data = await chatApi.listSessions();
      setSessions(data);
    } catch (err) {
      showToast('Failed to load chat sessions', 'error');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadPdfs = async () => {
    try {
      const data = await pdfsApi.list();
      setPdfs(data.filter((p: any) => p.status === 'INDEXED'));
    } catch (err) {
      // soft fail
    }
  };

  useEffect(() => {
    loadSessions();
    loadPdfs();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      if (!sessionId) {
        setMessages([]);
        return;
      }
      setLoadingHistory(true);
      try {
        const data = await chatApi.getMessages(sessionId);
        setMessages(data);
      } catch (err) {
        showToast('Failed to load message history', 'error');
      } finally {
        setLoadingHistory(false);
      }
    };
    loadMessages();
  }, [sessionId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const streamingRef = useRef('');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sessionId || streaming) return;

    const userText = inputMessage;
    const currentSessionId = sessionId; // capture for async callbacks
    setInputMessage('');
    setStreamingContent('');
    streamingRef.current = '';

    // Append user message instantly
    const userMsg: Message = { id: Math.random().toString(), role: 'USER', content: userText };
    setMessages((prev) => [...prev, userMsg]);

    await streamMessage(
      currentSessionId,
      userText,
      (chunk) => {
        // Filter out SSE control tokens
        if (chunk === '[DONE]' || chunk.startsWith('[ERROR]')) return;
        streamingRef.current += chunk;
        setStreamingContent((prev) => prev + chunk);
      },
      (err) => {
        showToast('Streaming error: ' + err.message, 'error');
        setStreamingContent('');
      },
      async () => {
        // Streaming complete — clear bubble and reload messages from DB
        // (more reliable than trusting stale closure state)
        setStreamingContent('');
        streamingRef.current = '';
        try {
          const freshMessages = await chatApi.getMessages(currentSessionId);
          setMessages(freshMessages);
        } catch {
          // fallback: keep what we have
        }
        loadSessions();
      }
    );
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;

    try {
      const session = await chatApi.createSession(
        newChatTitle,
        selectedPdfId ? selectedPdfId : null
      );
      showToast('Chat session created!', 'success');
      setShowNewChatModal(false);
      setNewChatTitle('');
      setSelectedPdfId('');
      loadSessions();
      navigate(`/chat/${session.id}`);
    } catch (err) {
      showToast('Failed to create session', 'error');
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] rounded-2xl glass-panel border border-slate-800/40 overflow-hidden relative">
      
      {/* Left sessions pane */}
      <div className="w-80 border-r border-slate-800/40 flex flex-col bg-slate-950/20">
        <div className="p-4 border-b border-slate-800/40">
          <button 
            onClick={() => setShowNewChatModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/10"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat Session</span>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loadingSessions ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs font-semibold">
              No sessions. Create one above!
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = sessionId === session.id;
              return (
                <Link
                  key={session.id}
                  to={`/chat/${session.id}`}
                  className={`flex items-center gap-3 p-3.5 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-slate-900 border border-slate-850 text-slate-100' 
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-slate-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-none">{session.title}</p>
                    {session.pdf && (
                      <p className="text-[10px] text-accent font-medium truncate mt-1 flex items-center gap-0.5">
                        <FileText className="w-3 h-3" /> {session.pdf.filename}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-650" />
                </Link>
              );
            })
          )}
        </div>
      </div>      {/* Right messages pane */}
      <div className="flex-1 flex flex-col bg-slate-900/10">
        {!sessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-6 select-none max-w-2xl mx-auto">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850/60 shadow-lg text-slate-500">
              <MessageSquare className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-200 font-display tracking-tight">Adaptive Study Assistant</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Connect your syllabus materials or chat with general context to explore concepts dynamically.
              </p>
            </div>

            {/* Capability cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 text-left space-y-1">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
                <h4 className="text-xs font-bold text-slate-350">General Q&A</h4>
                <p className="text-[10px] text-slate-550 leading-relaxed">Ask any academic question and get structured explanations.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 text-left space-y-1">
                <FileText className="w-4.5 h-4.5 text-accent" />
                <h4 className="text-xs font-bold text-slate-350">PDF Grounding</h4>
                <p className="text-[10px] text-slate-550 leading-relaxed">Upload a syllabus to ground responses in your course text.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 text-left space-y-1">
                <BookOpen className="w-4.5 h-4.5 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-350">Deep Concepts</h4>
                <p className="text-[10px] text-slate-550 leading-relaxed">Get code examples, logic breakdowns, and step-by-step answers.</p>
              </div>
            </div>
          </div>
        ) : (() => {
          const activeSession = sessions.find(s => s.id === sessionId);
          return (
            <>
              {/* Header Info Banner showing Active Context */}
              <div className="px-6 py-4 border-b border-slate-800/40 flex items-center justify-between bg-slate-950/20">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-200 truncate">
                    {activeSession ? activeSession.title : 'Chat Session'}
                  </h3>
                </div>
                {activeSession?.pdf ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <FileText className="w-3.5 h-3.5" /> PDF Context Active: {activeSession.pdf.filename}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-500">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> General Knowledge Mode
                  </span>
                )}
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingHistory ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                    ))}
                    
                    {/* Streaming token display */}
                    {streaming && streamingContent && (
                      <ChatMessage role="ASSISTANT" content={streamingContent} isStreaming={true} />
                    )}

                    {/* Loader status indicator */}
                    {streaming && !streamingContent && (
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-500 italic p-3 bg-slate-900/10 rounded-xl border border-slate-850/20 max-w-max">
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>AI is crafting a response...</span>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/40 glass-panel bg-slate-950/40">
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={streaming}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask a question about your course..."
                    className="w-full pl-5 pr-14 py-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || streaming}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          );
        })()}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-200 font-display flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-primary" /> Start New Chat
            </h3>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chat Title</label>
                <input
                  type="text"
                  required
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="e.g. Lesson 1 Review"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attach PDF Context (Optional)</label>
                <select
                  value={selectedPdfId}
                  onChange={(e) => setSelectedPdfId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:border-primary text-sm font-medium"
                >
                  <option value="">No PDF — General Study assistant</option>
                  {pdfs.map((pdf) => (
                    <option key={pdf.id} value={pdf.id}>{pdf.filename}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:bg-slate-900 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/20"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple loader helper
const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
