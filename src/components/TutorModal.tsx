import { useState, useRef, useEffect } from 'react';
import { X, Send, BookOpen, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

const IMAGE_KEYWORDS = [
  'draw', 'generate', 'create an image', 'create a diagram',
  'make an image', 'show me a picture', 'illustrate', 'diagram of',
  'visualize', 'sketch', 'picture of', 'image of',
];

function isImageRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return IMAGE_KEYWORDS.some(kw => lower.includes(kw));
}

function extractImagePrompt(text: string): string {
  const lower = text.toLowerCase();
  for (const kw of IMAGE_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      return text.slice(idx + kw.length).trim().replace(/^(a|an|the|me|of|for)\s+/i, '');
    }
  }
  return text;
}

interface TutorModalProps {
  onClose: () => void;
}

export default function TutorModal({ onClose }: TutorModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm your ScholarVault AI Tutor 👋\n\nI can help you understand any subject, explain concepts, solve problems, and even generate diagrams and illustrations.\n\nTry asking me something like:\n• \"Explain photosynthesis\"\n• \"Draw a diagram of the water cycle\"\n• \"Help me with quadratic equations\"\n\nWhat would you like to learn today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function generateImage(prompt: string): Promise<string> {
    const fullPrompt = `${prompt}, educational illustration, clean detailed academic diagram, white background, professional textbook style`;
    const encoded = encodeURIComponent(fullPrompt);
    return `https://image.pollinations.ai/prompt/${encoded}?width=600&height=400&nologo=true&seed=${Date.now()}`;
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const wantsImage = isImageRequest(userText);
      const imagePrompt = wantsImage ? extractImagePrompt(userText) : null;

      // Build conversation history (skip the welcome message)
      const history = messages
        .filter(m => m.id !== '0')
        .map(m => ({ role: m.role, content: m.content }));

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      let textResponse = '';

      if (apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: `You are a helpful, encouraging academic tutor for Loyola Jesuit College (LJC) students in Nigeria. You help with all school subjects including Mathematics, Science (Physics, Chemistry, Biology, Computer Science), Art, Social Sciences (Economics, Government, Geography, History), and English.

Be clear, concise and friendly. Use relatable examples for Nigerian/West African students when helpful. Break down complex topics step by step.

If asked to generate an image or diagram, briefly describe what the image will show and provide a thorough text explanation alongside it.

Format your responses cleanly. Use bullet points or numbered steps where helpful. Keep answers focused and educational.`,
            messages: [
              ...history,
              { role: 'user', content: userText },
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message ?? 'API error');
        }

        const data = await response.json();
        textResponse = data.content?.[0]?.text ?? "I couldn't generate a response. Please try again.";
      } else {
        textResponse = `⚠️ **AI Tutor not configured yet.**\n\nTo activate the tutor:\n1. Go to your Bolt project settings\n2. Add an environment variable: \`VITE_ANTHROPIC_API_KEY\`\n3. Get your key from console.anthropic.com\n\nOnce configured, I'll be fully powered by Claude AI!`;
      }

      // Generate image if requested
      let imageUrl: string | undefined;
      if (wantsImage && imagePrompt) {
        imageUrl = await generateImage(imagePrompt);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: textResponse,
        imageUrl,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Tutor error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I ran into an error. Please check your API key and try again!",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6">
      <div className="relative w-full max-w-3xl h-[92vh] bg-[#080808] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-white/5"
          style={{ background: 'rgba(229,9,20,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E50914] flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 20px rgba(229,9,20,0.4)' }}>
              <BookOpen size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                Scholar<span className="text-[#E50914]">Tutor</span>
              </h2>
              <p className="text-[10px] text-white/30">Powered by Claude AI · Image gen by Pollinations</p>
            </div>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-semibold">Online</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 scrollbar-hide">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles size={13} className="text-[#E50914]" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#E50914] text-white rounded-br-sm'
                    : 'bg-white/5 border border-white/8 text-white/90 rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.imageUrl && (
                  <div className="mt-3">
                    <div className="text-[10px] text-white/40 mb-1.5 flex items-center gap-1">
                      <Sparkles size={10} />
                      Generated illustration
                    </div>
                    <img
                      src={msg.imageUrl}
                      alt="Generated diagram"
                      className="rounded-xl w-full max-w-md border border-white/10"
                      onError={e => {
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) parent.innerHTML = '<p class="text-xs text-white/30 italic">Image generation timed out. Try again!</p>';
                      }}
                    />
                  </div>
                )}
                <p className="text-[10px] mt-1.5 opacity-30">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles size={13} className="text-[#E50914]" />
              </div>
              <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 sm:px-6 py-4 border-t border-white/5" style={{ background: 'rgba(255,255,255,0.01)' }}>
          {/* Quick prompts */}
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {['Explain a concept', 'Help with homework', 'Draw a diagram', 'Summarize a topic'].map(prompt => (
              <button
                key={prompt}
                onClick={() => setInput(prompt + ': ')}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/8 text-white/30 hover:text-white/60 hover:border-white/20 transition-all whitespace-nowrap flex-shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... e.g. 'Draw the water cycle' or 'Explain Newton's laws'"
              rows={1}
              className="flex-1 bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 px-4 py-3 rounded-xl outline-none resize-none transition-all focus:border-[#E50914]/40 focus:bg-white/8"
              style={{ fontFamily: 'Inter, sans-serif', maxHeight: '120px' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ background: '#E50914', boxShadow: input.trim() ? '0 4px 15px rgba(229,9,20,0.35)' : 'none' }}
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
          <p className="text-[10px] text-white/15 mt-2 text-center">
            Enter to send · Shift+Enter for new line · Say "draw" or "diagram" for images
          </p>
        </div>
      </div>
    </div>
  );
}