import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Zap, Sparkles, Bot } from 'lucide-react';
import { sendChatMessageStream, ChatMessage } from '../../services/openrouterService';

interface PlannerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  { emoji: '🏄', label: 'Plan de surf' },
  { emoji: '🍹', label: 'Vida nocturna' },
  { emoji: '🌅', label: 'Atardecer perfecto' },
  { emoji: '🍕', label: 'Dónde comer' },
  { emoji: '🏨', label: 'Dónde dormir' },
  { emoji: '🎉', label: 'Plan de fiesta' },
];

export const PlannerChatModal: React.FC<PlannerChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setStreamingContent('');
      setIsLoading(false);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const allMessages = [...messages, userMsg];
      let fullResponse = '';

      await sendChatMessageStream(
        allMessages,
        (chunk) => {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
        },
        abortController.signal,
      );

      setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
      setStreamingContent('');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Error al conectar con el servicio. Verifica tu conexión e intenta de nuevo.',
        }]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      if (streamingContent) {
        setMessages(prev => [...prev, { role: 'assistant', content: streamingContent }]);
      }
      setStreamingContent('');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayMessages = streamingContent
    ? [...messages, { role: 'assistant' as const, content: streamingContent }]
    : messages;

  return (
    <div className="fixed inset-0 z-[2500] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0f172a] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300" style={{ maxHeight: '85vh', height: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">24H Planner</h2>
              <p className="text-[10px] text-amber-400 font-bold">Tu asistente local en Montañita</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                <Bot className="w-10 h-10 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white mb-1">¿Qué plan quieres armar?</h3>
                <p className="text-sm text-slate-400 font-medium">Pregúntame sobre actividades, comida, surf, fiesta o cualquier cosa en Montañita</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt.label}
                    onClick={() => handleSend(prompt.label)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border border-white/10 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white hover:border-amber-500/30 transition-all"
                  >
                    <span>{prompt.emoji}</span>
                    <span>{prompt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {displayMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-tr-sm'
                    : 'bg-slate-800/80 text-slate-100 border border-white/5 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && !streamingContent && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-800/80 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/5 bg-[#0f172a]">
          <div className="flex items-center gap-2 bg-slate-800/60 border border-white/10 rounded-2xl p-1.5 focus-within:border-amber-500/40 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pregunta sobre Montañita..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-slate-500 px-3 py-2 disabled:opacity-50"
            />
            {isLoading ? (
              <button
                onClick={handleStop}
                className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
