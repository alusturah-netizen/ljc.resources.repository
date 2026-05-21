import { useState, useRef, useEffect } from 'react';
import { X, Send, BookOpen, Sparkles, Image as ImageIcon } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  timestamp: Date;
}

const IMAGE_KEYWORDS = [
  'draw ', 'generate ', 'create an image', 'create a diagram',
  'make an image', 'show me a picture', 'illustrate', 'diagram of',
  'visualize', 'sketch', 'picture of', 'image of', 'show a diagram',
];

function isImageRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return IMAGE_KEYWORDS.some(kw => lower.includes(kw));
}

function extractImagePrompt(text: string): string {
  const lower = text.toLowerCase();
  for (const kw of IMAGE_KEYWORDS) {
    const idx = lower.indexOf(kw.trim());
    if (idx !== -1) {
      return text.slice(idx + kw.trim().length).trim().replace(/^(a |an |the |me |of |for )/i, '');
    }
  }
  return text;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function MarkdownLine({ line }: { line: string }) {
  // Parse inline: bold, italic, inline code
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    // Inline code `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);

    const boldIdx = boldMatch ? (boldMatch[1]?.length ?? 0) : Infinity;
    const codeIdx = codeMatch ? (codeMatch[1]?.length ?? 0) : Infinity;

    if (boldIdx === Infinity && codeIdx === Infinity) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (boldIdx <= codeIdx && boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="font-bold text-white">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
    } else if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-white/10 text-[#E50914] font-mono text-[11px]">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  return <>{parts}</>;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;
  let elemKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={elemKey++} className="space-y-1 my-2 pl-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/80 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#E50914] flex-shrink-0" />
              <span><MarkdownLine line={item} /></span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length > 0) {
      elements.push(
        <ol key={elemKey++} className="space-y-1 my-2 pl-1">
          {orderedItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/80 leading-relaxed">
              <span className="font-bold text-[#E50914] flex-shrink-0 text-xs mt-0.5 min-w-[16px]">{i + 1}.</span>
              <span><MarkdownLine line={item} /></span>
            </li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  const flushCode = () => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={elemKey++} className="bg-black/40 border border-white/8 rounded-xl p-3 my-2 overflow-x-auto">
          <code className="text-[11px] text-emerald-300 font-mono leading-relaxed">
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      codeLines = [];
    }
  };

  for (const line of lines) {
    // Code fence
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Heading
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);

    if (h1 || h2 || h3) {
      flushList();
      const text = (h1 || h2 || h3)![1];
      elements.push(
        <p key={elemKey++} className={`font-black text-white my-2 ${h1 ? 'text-base' : h2 ? 'text-sm' : 'text-sm'}`} style={{ letterSpacing: '-0.03em' }}>
          <MarkdownLine line={text} />
        </p>
      );
      continue;
    }

    // Bullet list
    const bullet = line.match(/^[-*•]\s+(.*)/);
    if (bullet) {
      if (orderedItems.length > 0) { flushList(); }
      listItems.push(bullet[1]);
      continue;
    }

    // Ordered list
    const ordered = line.match(/^\d+\.\s+(.*)/);
    if (ordered) {
      if (listItems.length > 0) { flushList(); }
      orderedItems.push(ordered[1]);
      continue;
    }

    flushList();

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={elemKey++} className="border-white/10 my-3" />);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={elemKey++} className="h-1" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={elemKey++} className="text-sm text-white/85 leading-relaxed">
        <MarkdownLine line={line} />
      </p>
    );
  }

  flushList();
  flushCode();

  return <div className="space-y-0.5">{elements}</div>;
}

// ─── Image component with loading state ───────────────────────────────────────
function GeneratedImage({ url, prompt }: { url: string; prompt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="mt-3">
      <div className="text-[10px] text-white/40 mb-1.5 flex items-center gap-1">
        <ImageIcon size={10} />
        <span>Generated: {prompt}</span>
      </div>
      {status === 'loading' && (
        <div className="w-full h-48 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#E50914]/40 border-t-[#E50914] rounded-full animate-spin" />
            <span className="text-[10px] text-white/30">Generating image...</span>
          </div>
        </div>
      )}
      <img
        src={url}
        alt={prompt}
        className={`rounded-xl w-full max-w-md border border-white/10 ${status === 'loading' ? 'hidden' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status === 'error' && (
        <p className="text-xs text-white/30 italic bg-white/5 rounded-xl px-3 py-2">
          Image generation timed out. Try a simpler description!
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface TutorModalProps {
  onClose: () => void;
}

export default function TutorModal({ onClose }: TutorModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi! I'm your **ScholarVault AI Tutor** 👋

I can help you with any subject — Mathematics, Science, English, Social Sciences and more.

Try asking me:
- Explain photosynthesis
- Draw a diagram of the water cycle
- Help me with quadratic equations
- Summarize Newton's laws of motion

What would you like to learn today?`,
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
    const styled = `${prompt}, detailed educational illustration, textbook diagram style, clean lines, labeled, white background, professional, high quality`;
    const encoded = encodeURIComponent(styled);
    // Use flux model for much better quality
    return `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=800&height=500&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 99999)}`;
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const wantsImage = isImageRequest(userText);
      const imagePrompt = wantsImage ? extractImagePrompt(userText) : null;

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

Format your responses clearly using markdown:
- Use **bold** for key terms and important points
- Use bullet points (-) or numbered lists for steps and lists
- Use headers (##) to separate major sections in longer answers
- Use \`code\` for formulas or technical terms
- Keep paragraphs short and easy to read
- Be friendly, clear and encouraging

Use relatable examples for Nigerian/West African students when helpful. If asked to generate an image or diagram, describe it briefly then give your full text explanation.`,
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
        textResponse = `**AI Tutor not configured yet**

To activate the tutor:

1. Go to **console.anthropic.com** and create an API key
2. In Bolt, open the **.env** file
3. Add this line: \`VITE_ANTHROPIC_API_KEY=your_key_here\`
4. Restart the preview

Once configured, I'll be fully powered by Claude AI!`;
      }

      let imageUrl: string | undefined;
      if (wantsImage && imagePrompt) {
        imageUrl = await generateImage(imagePrompt);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: textResponse,
        imageUrl,
        imagePrompt: imagePrompt ?? undefined,
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5" style={{ background: 'rgba(229,9,20,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E50914] flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 20px rgba(229,9,20,0.4)' }}>
              <BookOpen size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                Scholar<span className="text-[#E50914]">Tutor</span>
              </h2>
              <p className="text-[10px] text-white/30">Powered by Claude AI</p>
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6 scrollbar-hide">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles size={13} className="text-[#E50914]" />
                </div>
              )}
              <div className={`max-w-[84%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-[#E50914] text-white rounded-br-sm' : 'bg-white/5 border border-white/8 text-white/90 rounded-bl-sm'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <MarkdownContent content={msg.content} />
                )}
                {msg.imageUrl && msg.imagePrompt && (
                  <GeneratedImage url={msg.imageUrl} prompt={msg.imagePrompt} />
                )}
                <p className="text-[10px] mt-2 opacity-25">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

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
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {['Explain a concept', 'Help with maths', 'Draw a diagram', 'Summarize a topic'].map(prompt => (
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