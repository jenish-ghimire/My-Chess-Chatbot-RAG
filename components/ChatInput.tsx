'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  suggestions?: string[];
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  suggestions = [
    "What is Jenish Ghimire's FIDE rating?",
    "Show links to Jenish's chess profiles.",
    "Tell me about Jenish Ghimire's chess federations.",
  ],
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    onSendMessage(suggestion);
  };

  return (
    <div className="w-full space-y-3">
      {/* Quick Suggestion Pills */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium mr-1">
            <Sparkles className="h-3.5 w-3.5" /> Prompt Suggestions:
          </div>
          {suggestions.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(prompt)}
              disabled={isLoading}
              className="text-xs bg-slate-900/90 hover:bg-amber-950/70 text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 px-3 py-1 rounded-full transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Chess AI Assistant about Jenish Ghimire..."
          rows={1}
          disabled={isLoading}
          className="w-full resize-none rounded-xl bg-slate-900 border border-slate-800 py-3.5 pl-4 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 transition-colors shadow-inner"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2.5 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
          title="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
      <div className="flex justify-between px-2 text-[11px] text-slate-500">
        <span>Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Enter</kbd> to send, <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Shift + Enter</kbd> for new line</span>
        <span>Jenish Ghimire Chess AI v1.0</span>
      </div>
    </div>
  );
};
