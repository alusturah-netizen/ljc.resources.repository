import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Paperclip, X, Sparkles, Bot, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface TutorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TutorModal({ isOpen, onClose }: TutorModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey! I'm your AI Academic Collaborator. Drop any complex concepts, assignments, or textbook queries here—let's break them down clearly using crisp tables and direct summaries. What are we mastering today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageContent = input.trim();
    setInput('');
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessageContent
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // 🟢 Injected system prompt forces responses to stay beautifully structured like mine
      const dialogueHistory = [
        {
          role: "system",
          content: "You are an insightful, authentic AI academic collaborator. Break down complex math, finance, economics, and science items cleanly using clear headers, bullet lists, bold emphasis syntax, and markdown tables. Avoid long dense prose. Balance empathy with candor and match the user's style with a touch of wit."
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessageContent }
      ];

      // Replace this edge fetch call with your local project API route endpoint configuration if different
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: dialogueHistory }),
      });

      if (!response.ok) throw new Error('Network payload query dropped');
      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || data.reply || "I encountered a minor processing hitch. Let's try re-submitting that prompt."
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Tutor connection crash error:", error);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "Sorry, I lost my connection pipeline for a second there. Could you repeat that last thought?"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal App Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg text-white shadow-md shadow-blue-500/10">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">AI Academic Tutor</h3>
              <p className="text-slate-400 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Online & Ready
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Scrolling Chat Content Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/40">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                  <Sparkles size={14} />
                </div>
              )}
              
              <div className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  /* 🟢 Rich Text & Table Renderer Formatting Context Engine */
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    className="prose prose-invert prose-sm max-w-none space-y-2.5
                      prose-headings:font-semibold prose-headings:text-white prose-headings:mt-3 prose-headings:mb-1
                      prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
                      prose-strong:text-blue-400 prose-strong:font-bold
                      prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4
                      prose-table:w-full prose-table:my-2 prose-table:border-collapse 
                      prose-th:bg-slate-950 prose-th:text-slate-200 prose-th:p-2 prose-th:border prose-th:border-slate-700 prose-th:text-left
                      prose-td:p-2 prose-td:border prose-td:border-slate-700 prose-td:text-slate-300"
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 shadow-sm">
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0 animate-pulse">
                <Bot size={14} />
              </div>
              <div className="bg-slate-800 border border-slate-700/60 rounded-xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-1.5 text-slate-400 shadow-sm">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Form Entry Field Area Dashboard Section */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <form onSubmit={handleSend} className="flex items-center gap-3 bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500/80 transition-all">
            
            {/* 🟢 Interactive Document Upload Button Clip */}
            <label className="cursor-pointer text-slate-400 hover:text-blue-400 p-1.5 hover:bg-slate-800 rounded-lg transition shrink-0 flex items-center justify-center">
              <Paperclip size={18} />
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) alert(`Selected attachment payload file: ${file.name}`);
                }} 
              />
            </label>

            {/* 🟢 High contrast typography and dark slate background container configuration */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask anything... e.g., 'Explain Balance of Trade'"
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none resize-none py-1.5 max-h-28"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />

            <button 
              type="submit" 
              disabled={!input.trim() || loading} 
              className="text-slate-400 hover:text-blue-400 disabled:text-slate-700 p-1.5 hover:bg-slate-800 rounded-lg transition shrink-0 flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}