'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ChatMessage } from '@/lib/llm';
import { RefreshCw, Trophy, Crown, Star, Target, ExternalLink } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-chess',
      role: 'assistant',
      content:
        "👋 Welcome! I am the Chess Profile AI Assistant for **Jenish Ghimire**.\n\nAsk me anything about his FIDE ratings, tournament history, Lichess & Chess.com stats.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No response returned from assistant endpoint.',
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, an error occurred while sending your message. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Conversation history cleared. Ask me any chess profile questions!',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto w-full bg-slate-950 border-x border-slate-900 shadow-2xl">
      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 shadow-lg shadow-amber-500/20 text-slate-950">
            <Crown className="h-6 w-6 font-bold" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base tracking-tight flex items-center gap-2">
              Jenish Ghimire Chess AI
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full">
                FIDE 12328421
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Trophy className="h-3.5 w-3.5" /> Rating: 1699 (NEP)
              </span>
              <span className="h-3 w-px bg-slate-800 hidden sm:inline"></span>
              <a
                href="https://ratings.fide.com/profile/12328421"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 flex items-center gap-0.5 transition-colors"
              >
                FIDE <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <span className="h-3 w-px bg-slate-800"></span>
              <a
                href="https://www.chess.com/member/jenishghimirechess"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 flex items-center gap-0.5 transition-colors"
              >
                Chess.com <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <span className="h-3 w-px bg-slate-800"></span>
              <a
                href="https://lichess.org/@/jenishghimire"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 flex items-center gap-0.5 transition-colors"
              >
                Lichess <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Clear Chat"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </header>

      {/* Messages Stream Container */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 py-3 px-4 items-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Star className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              Assistant thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Footer / Input Area */}
      <footer className="p-4 sm:p-6 border-t border-slate-900 bg-slate-950/90 backdrop-blur-md">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          suggestions={[
            "What is Jenish's highest rating format on Lichess?",
            "What is Jenish's FIDE rating history and progression?",
            "What are Jenish's Chess.com stats and username?",
          ]}
        />
      </footer>
    </div>
  );
};
