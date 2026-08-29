'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Crown, User, FileText, Check, Copy } from 'lucide-react';
import { ChatMessage } from '@/lib/llm';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex w-full gap-3 py-3 px-2 sm:px-4 transition-colors ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/10">
          <Crown className="h-5 w-5" />
        </div>
      )}

      <div
        className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
          isUser
            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 font-medium rounded-br-xs'
            : 'bg-slate-900/80 border border-slate-800 text-slate-100 rounded-bl-xs backdrop-blur-md'
        }`}
      >
        {/* Header label for assistant */}
        {!isUser && (
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-amber-400 border-b border-slate-800/60 pb-1">
            <span>Chess AI Assistant</span>
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Copy message"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        {/* Formatted Markdown Content */}
        <div className="text-slate-100 text-sm leading-relaxed overflow-hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold text-amber-300">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside pl-5 mb-2.5 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside pl-5 mb-2.5 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              h1: ({ children }) => (
                <h1 className="font-bold text-base text-amber-400 mt-3 mb-1.5">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="font-bold text-sm text-amber-400 mt-2.5 mb-1">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-semibold text-sm text-amber-300 mt-2 mb-1">{children}</h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-amber-500/50 pl-3 italic text-slate-400 my-2">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-slate-950/80 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-800">
                  {children}
                </code>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2.5 rounded-lg border border-slate-800">
                  <table className="min-w-full text-xs text-left">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-slate-950/60 text-amber-400">{children}</thead>,
              th: ({ children }) => (
                <th className="px-3 py-1.5 font-semibold border-b border-slate-800">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-1.5 border-b border-slate-800/60 text-slate-200">{children}</td>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline hover:text-amber-300 transition-colors"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Source attribution preview */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 border-t border-slate-800/80 pt-2 text-xs">
            <div className="mb-1.5 text-slate-400 font-medium flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-amber-400" /> Referenced Knowledge Sources:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-300"
                  title={src.snippet}
                >
                  {src.title} ({Math.round(src.score * 100)}%)
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          className={`mt-1.5 text-[10px] ${
            isUser ? 'text-slate-900 text-right font-medium' : 'text-slate-500'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};
