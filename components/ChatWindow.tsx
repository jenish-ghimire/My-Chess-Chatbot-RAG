'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ChatMessage } from '@/lib/llm';
import { ShieldCheck, Cpu, Database, RefreshCw, Sparkles } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Hello! I am the OwnerHive AI Assistant. Stage 1 setup is complete and ready. Ask me any question to test the basic chat connection!',
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
        content: 'Chat cleared. How can I assist you now?',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto w-full bg-slate-950 border-x border-slate-900 shadow-2xl">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base tracking-tight flex items-center gap-2">
              OwnerHive AI Assistant
              <span className="inline-flex items-center gap-1 text-[11px] font-normal bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full">
                Mini RAG Prototype
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Stage 1 Active
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-slate-500" /> LLM Ready
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3 text-slate-500" /> Vector Store Pending
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
              OwnerHive Assistant is processing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Footer / Input Area */}
      <footer className="p-4 sm:p-6 border-t border-slate-900 bg-slate-950/90 backdrop-blur-md">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};
