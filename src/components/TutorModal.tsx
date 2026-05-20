import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Paperclip, X, Sparkles, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sender?: string;
  text?: string;
}

interface TutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 🟢 Matching your exact original property hooks from App.tsx
  messages: Message[];
  newMessage: string;
  setNewMessage: (value: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

export default function TutorModal({ 
  isOpen, 
  onClose, 
  messages = [], 
  newMessage = '', 
  setNewMessage, 
  sendMessage,
  isLoading = false 
}: TutorModalProps) {
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header Layout */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg text-white shadow-md">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">AI Academic Tutor</h3>
              <p className="text-slate-400 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Online & Syncing
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Scrolling Message Container Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/40">
          {messages.map((msg, index) => {
            // Normalize data mapping to handle both standard format and legacy layout variables
            const isUser = msg.role === 'user' || msg.sender === 'user';
            const textContent = msg.content || msg.text || '';
            const msgId = msg.id || index.toString();

            return (
              <div key={msgId} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                    <Sparkles size={14} />
                  </div>
                )}
                
                <div className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm
                  ${isUser 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  ) : (
                    /* 🟢 Formats raw markdown data streams into bold strings, neat headers, and crisp tables */
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      className="prose prose-invert prose-sm max-w-none space-y-2.5
                        prose-headings:font-semibold prose-headings:text-white prose-headings:mt-3 prose-headings:mb-1
                        prose-h1:text-base prose-h2:text-sm prose-strong:text-blue-400 prose-strong:font-bold
                        prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4
                        prose-table:w-full prose-table:my-2 prose-table:border-collapse 
                        prose-th:bg-slate-950 prose-th:text-slate-200 prose-th:p-2 prose-th:border prose-th:border-slate-700 prose-th:text-left
                        prose-td:p-2 prose-td:border prose-td:border-slate-700 prose-td:text-slate-300"
                    >
                      {textContent}
                    </ReactMarkdown>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 shadow-sm">
                    <User size={14} />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0 animate-pulse">
                <Bot size={14} />
              </div>
              <div className="bg-slate-800 border border-slate-700/60 rounded-xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Form Entry Field Area Container */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <form onSubmit={sendMessage} className="flex items-center gap-3 bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500/80 transition-all">
            
            {/* 🟢 The Upload Attachment Paperclip Button */}
            <label className="cursor-pointer text-slate-400 hover:text-blue-400 p-1.5 hover:bg-slate-800 rounded-lg transition shrink-0 flex items-center justify-center">
              <Paperclip size={18} />
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) alert(`Selected file attachment: ${file.name}`);
                }} 
              />
            </label>

            {/* 🟢 Transparent typing space, color forced to white so text displays vividly */}
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Ask anything... e.g., 'Explain Balance of Trade'"
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none resize-none py-1.5 max-h-28"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />

            <button 
              type="submit" 
              disabled={!newMessage.trim() || isLoading} 
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