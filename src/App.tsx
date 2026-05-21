import { useState, useRef, useEffect } from 'react';
import {
  X, Send, BookOpen, Sparkles, Image as ImageIcon,
  Paperclip, Brain, MessageCircle, CheckCircle2, XCircle, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  uploadedImage?: string; // base64
  timestamp: Date;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface QuizState {
  topic: string;
  questions: QuizQuestion[];
  current: number;
  selected: number | null;
  score: number;
  finished: boolean;
}

type Mode = 'chat' | 'quiz';

// ─── Image generation ─────────────────────────────────────────────────────────
const IMAGE_KEYWORDS = ['draw ', 'generate ', 'create an image', 'create a diagram', 'make an image', 'show me a picture', 'illustrate', 'diagram of', 'visualize', 'sketch', 'picture of', 'image of', 'show a diagram'];

function isImageRequest(text: string) {
  return IMAGE_KEYWORDS.some(kw => text.toLowerCase().includes(kw));
}

function extractImagePrompt(text: string) {
  const lower = text.toLowerCase();
  for (const kw of IMAGE_KEYWORDS) {
    const idx = lower.indexOf(kw.trim());
    if (idx !== -1) return text.slice(idx + kw.trim().length).trim().replace(/^(a |an |the |me |of |for )/i, '');
  }
  return text;
}

async function generateImage(prompt: string) {
  const styled = `${prompt}, detailed educational illustration, textbook diagram style, clean lines, labeled, white background, professional, high quality`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(styled)}?model=flux&width=800&height=500&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 99999)}`;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function MarkdownLine({ line }: { line: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    const boldIdx = boldMatch ? (boldMatch[1]?.length ?? 0) : Infinity;
    const codeIdx = codeMatch ? (codeMatch[1]?.length ?? 0) : Infinity;
    if (boldIdx === Infinity && codeIdx === Infinity) { parts.push(<span key={key++}>{remaining}</span>); break; }
    if (boldIdx <= codeIdx && boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="font-bold text-white">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
    } else if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-white/10 text-[#E50914] font-mono text-[11px]">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
    } else { parts.push(<span key={key++}>{remaining}</span>); break; }
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
  let k = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={k++} className="space-y-1 my-2 pl-1">{listItems.map((item, i) => (<li key={i} className="flex items-start gap-2 text-sm text-white/80 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#E50914] flex-shrink-0" /><span><MarkdownLine line={item} /></span></li>))}</ul>);
      listItems = [];
    }
    if (orderedItems.length > 0) {
      elements.push(<ol key={k++} className="space-y-1 my-2 pl-1">{orderedItems.map((item, i) => (<li key={i} className="flex items-start gap-2 text-sm text-white/80 leading-relaxed"><span className="font-bold text-[#E50914] flex-shrink-0 text-xs mt-0.5 min-w-[16px]">{i + 1}.</span><span><MarkdownLine line={item} /></span></li>))}</ol>);
      orderedItems = [];
    }
  };
  const flushCode = () => {
    if (codeLines.length > 0) {
      elements.push(<pre key={k++} className="bg-black/40 border border-white/8 rounded-xl p-3 my-2 overflow-x-auto"><code className="text-[11px] text-emerald-300 font-mono leading-relaxed">{codeLines.join('\n')}</code></pre>);
      codeLines = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) { if (inCode) { flushCode(); inCode = false; } else { flushList(); inCode = true; } continue; }
    if (inCode) { codeLines.push(line); continue; }
    const h1 = line.match(/^#\s+(.*)/); const h2 = line.match(/^##\s+(.*)/); const h3 = line.match(/^###\s+(.*)/);
    if (h1 || h2 || h3) { flushList(); const text = (h1 || h2 || h3)![1]; elements.push(<p key={k++} className="font-black text-white my-2 text-sm" style={{ letterSpacing: '-0.03em' }}><MarkdownLine line={text} /></p>); continue; }
    const bullet = line.match(/^[-*•]\s+(.*)/);
    if (bullet) { if (orderedItems.length > 0) flushList(); listItems.push(bullet[1]); continue; }
    const ordered = line.match(/^\d+\.\s+(.*)/);
    if (ordered) { if (listItems.length > 0) flushList(); orderedItems.push(ordered[1]); continue; }
    flushList();
    if (line.match(/^---+$/)) { elements.push(<hr key={k++} className="border-white/10 my-3" />); continue; }
    if (!line.trim()) { elements.push(<div key={k++} className="h-1" />); continue; }
    elements.push(<p key={k++} className="text-sm text-white/85 leading-relaxed"><MarkdownLine line={line} /></p>);
  }
  flushList(); flushCode();
  return <div className="space-y-0.5">{elements}</div>;
}

function GeneratedImage({ url, prompt }: { url: string; prompt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  return (
    <div className="mt-3">
      <div className="text-[10px] text-white/40 mb-1.5 flex items-center gap-1"><ImageIcon size={10} /><span>Generated: {prompt}</span></div>
      {status === 'loading' && <div className="w-full h-48 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center"><div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-[#E50914]/40 border-t-[#E50914] rounded-full animate-spin" /><span className="text-[10px] text-white/30">Generating image...</span></div></div>}
      <img src={url} alt={prompt} className={`rounded-xl w-full max-w-md border border-white/10 ${status === 'loading' ? 'hidden' : ''}`} onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} />
      {status === 'error' && <p className="text-xs text-white/30 italic bg-white/5 rounded-xl px-3 py-2">Image generation timed out. Try a simpler description!</p>}
    </div>
  );
}

// ─── Quiz component ───────────────────────────────────────────────────────────
function QuizMode() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startQuiz() {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError('API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: `You are a quiz generator for Nigerian secondary school students. Generate multiple choice questions. 
RESPOND ONLY WITH VALID JSON — no markdown, no explanation, no backticks. Just raw JSON.
Format: {"questions":[{"question":"...","options":["A)...","B)...","C)...","D)..."],"correct":0,"explanation":"..."}]}
correct is the 0-based index of the correct option. Make questions clear and educational.`,
          messages: [{ role: 'user', content: `Generate ${numQuestions} ${difficulty} multiple choice questions about: ${topic}. Return only JSON.` }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setQuiz({ topic, questions: parsed.questions, current: 0, selected: null, score: 0, finished: false });
    } catch (e) {
      setError('Failed to generate quiz. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(idx: number) {
    if (!quiz || quiz.selected !== null) return;
    setQuiz(prev => prev ? { ...prev, selected: idx } : prev);
  }

  function nextQuestion() {
    if (!quiz) return;
    const correct = quiz.selected === quiz.questions[quiz.current].correct;
    const newScore = quiz.score + (correct ? 1 : 0);
    const next = quiz.current + 1;
    if (next >= quiz.questions.length) {
      setQuiz(prev => prev ? { ...prev, score: newScore, finished: true } : prev);
    } else {
      setQuiz(prev => prev ? { ...prev, current: next, selected: null, score: newScore } : prev);
    }
  }

  function resetQuiz() {
    setQuiz(null);
    setTopic('');
  }

  // Quiz setup screen
  if (!quiz) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-14 h-14 rounded-2xl bg-[#E50914]/15 flex items-center justify-center mb-4">
          <Brain size={28} className="text-[#E50914]" />
        </div>
        <h3 className="text-white font-black text-lg mb-1" style={{ letterSpacing: '-0.03em' }}>Quiz Mode</h3>
        <p className="text-white/40 text-sm mb-8 text-center">Enter a topic and I'll generate a custom quiz for you</p>

        <div className="w-full max-w-md space-y-4">
          <div>
            <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase block mb-1.5">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startQuiz()}
              placeholder="e.g. Photosynthesis, Quadratic Equations, World War II..."
              className="w-full bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 px-4 py-3 rounded-xl outline-none focus:border-[#E50914]/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase block mb-1.5">Difficulty</label>
              <div className="flex gap-1">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className="flex-1 py-2 rounded-lg text-[11px] font-bold capitalize transition-all"
                    style={{ background: difficulty === d ? '#E50914' : 'rgba(255,255,255,0.05)', color: difficulty === d ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase block mb-1.5">Questions</label>
              <div className="flex gap-1">
                {[5, 10, 15].map(n => (
                  <button key={n} onClick={() => setNumQuestions(n)}
                    className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                    style={{ background: numQuestions === n ? '#E50914' : 'rgba(255,255,255,0.05)', color: numQuestions === n ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}

          <button
            onClick={startQuiz}
            disabled={!topic.trim() || loading}
            className="w-full py-3 rounded-xl font-black text-white text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#E50914', boxShadow: '0 4px 20px rgba(229,9,20,0.3)' }}
          >
            {loading ? 'Generating Quiz...' : 'Start Quiz →'}
          </button>
        </div>
      </div>
    );
  }

  // Finished screen
  if (quiz.finished) {
    const pct = Math.round((quiz.score / quiz.questions.length) * 100);
    const grade = pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good job!' : pct >= 40 ? 'Keep practising!' : 'Study more!';
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: pct >= 60 ? 'rgba(16,185,129,0.2)' : 'rgba(229,9,20,0.2)' }}>
          <span className="text-2xl font-black" style={{ color: pct >= 60 ? '#10B981' : '#E50914' }}>{pct}%</span>
        </div>
        <h3 className="text-white font-black text-xl mb-1" style={{ letterSpacing: '-0.03em' }}>{grade}</h3>
        <p className="text-white/40 text-sm mb-2">You scored {quiz.score} out of {quiz.questions.length}</p>
        <p className="text-white/30 text-xs mb-8">Topic: {quiz.topic}</p>
        <button onClick={resetQuiz} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#E50914' }}>
          <RotateCcw size={14} /> Try Another Quiz
        </button>
      </div>
    );
  }

  // Active quiz
  const q = quiz.questions[quiz.current];
  const answered = quiz.selected !== null;
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-white/40 font-semibold">Question {quiz.current + 1} of {quiz.questions.length}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(229,9,20,0.15)', color: '#E50914' }}>Score: {quiz.score}</span>
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full mb-6">
        <div className="h-1 rounded-full bg-[#E50914] transition-all duration-300" style={{ width: `${((quiz.current) / quiz.questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-5 mb-4">
        <p className="text-white font-semibold text-sm leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {q.options.map((opt, i) => {
          const isSelected = quiz.selected === i;
          const isCorrect = i === q.correct;
          let bg = 'rgba(255,255,255,0.04)';
          let border = 'rgba(255,255,255,0.08)';
          let textColor = 'rgba(255,255,255,0.7)';
          if (answered) {
            if (isCorrect) { bg = 'rgba(16,185,129,0.15)'; border = '#10B981'; textColor = '#10B981'; }
            else if (isSelected) { bg = 'rgba(229,9,20,0.15)'; border = '#E50914'; textColor = '#E50914'; }
          } else if (isSelected) {
            bg = 'rgba(229,9,20,0.15)'; border = '#E50914'; textColor = '#fff';
          }
          return (
            <button
              key={i}
              onClick={() => selectAnswer(i)}
              disabled={answered}
              className="w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3"
              style={{ background: bg, borderColor: border }}
            >
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', color: textColor }}>
                {optionLetters[i]}
              </span>
              <span className="text-sm" style={{ color: textColor }}>{opt.replace(/^[A-D]\)\s*/, '')}</span>
              {answered && isCorrect && <CheckCircle2 size={16} className="ml-auto text-emerald-400 flex-shrink-0" />}
              {answered && isSelected && !isCorrect && <XCircle size={16} className="ml-auto text-red-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && (
        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 mb-4">
          <p className="text-[11px] font-bold text-white/40 mb-1 uppercase tracking-widest">Explanation</p>
          <p className="text-sm text-white/70 leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {answered && (
        <button onClick={nextQuestion} className="w-full py-3 rounded-xl font-black text-white text-sm transition-all active:scale-95" style={{ background: '#E50914', boxShadow: '0 4px 20px rgba(229,9,20,0.3)' }}>
          {quiz.current + 1 >= quiz.questions.length ? 'See Results →' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}

// ─── Main TutorModal ──────────────────────────────────────────────────────────
interface TutorModalProps { onClose: () => void; }

export default function TutorModal({ onClose }: TutorModalProps) {
  const { profile } = useAuth();
  const isTeacher = profile?.role === 'teacher';

  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: `Hi! I'm your **ScholarVault ${isTeacher ? 'AI Assistant' : 'AI Tutor'}** 👋\n\nI can help with any subject — Maths, Science, English, Social Sciences and more.\n\nTry asking me:\n- Explain photosynthesis\n- Draw a diagram of the water cycle\n- Help me with quadratic equations\n- Upload an image and ask a question about it\n\nWhat would you like to learn today?`,
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please upload an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadedImage(base64);
      setUploadedName(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendMessage() {
    if ((!input.trim() && !uploadedImage) || loading) return;
    const userText = input.trim() || 'What is in this image?';
    const imgBase64 = uploadedImage;
    const imgName = uploadedName;

    const userMessage: Message = {
      id: Date.now().toString(), role: 'user', content: userText,
      uploadedImage: imgBase64 ? `data:image/jpeg;base64,${imgBase64}` : undefined,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUploadedImage(null);
    setUploadedName('');
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const wantsImage = isImageRequest(userText) && !imgBase64;
      const imagePrompt = wantsImage ? extractImagePrompt(userText) : null;
      const history = messages.filter(m => m.id !== '0').map(m => ({ role: m.role, content: m.content }));
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      let textResponse = '';

      if (apiKey) {
        // Build user content
        const userContent: any[] = [];
        if (imgBase64) {
          userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgBase64 } });
        }
        userContent.push({ type: 'text', text: userText });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: `You are a helpful, encouraging academic ${isTeacher ? 'assistant' : 'tutor'} for Loyola Jesuit College (LJC) ${isTeacher ? 'teachers' : 'students'} in Nigeria. You help with all school subjects including Mathematics, Science (Physics, Chemistry, Biology, Computer Science), Art, Social Sciences, and English.

Format responses clearly using markdown:
- Use **bold** for key terms
- Use bullet points (-) or numbered lists for steps
- Use headers (##) to separate major sections
- Use \`code\` for formulas or technical terms
- Keep paragraphs short and readable
- Be friendly, clear and encouraging

Use relatable examples for Nigerian/West African context when helpful.`,
            messages: [...history, { role: 'user', content: imgBase64 ? userContent : userText }],
          }),
        });
        const data = await response.json();
        textResponse = data.content?.[0]?.text ?? "I couldn't generate a response. Please try again.";
      } else {
        textResponse = `**AI Assistant not configured yet**\n\nTo activate:\n1. Go to **console.anthropic.com** and create an API key\n2. In Bolt, open the **.env** file\n3. Add: \`VITE_ANTHROPIC_API_KEY=your_key_here\`\n4. Restart the preview`;
      }

      let genImageUrl: string | undefined;
      if (wantsImage && imagePrompt) genImageUrl = await generateImage(imagePrompt);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: textResponse,
        imageUrl: genImageUrl, imagePrompt: imagePrompt ?? undefined, timestamp: new Date(),
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I ran into an error. Please try again!", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }

  const title = isTeacher ? 'AI Assistant' : 'AI Tutor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6">
      <div className="relative w-full max-w-3xl h-[92vh] bg-[#080808] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5" style={{ background: 'rgba(229,9,20,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E50914] flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(229,9,20,0.4)' }}>
              <BookOpen size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                Scholar<span className="text-[#E50914]">{title}</span>
              </h2>
              <p className="text-[10px] text-white/30">Powered by Claude AI</p>
            </div>
            <div className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-semibold">Online</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex rounded-xl bg-white/5 p-0.5 gap-0.5">
              <button onClick={() => setMode('chat')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all" style={{ background: mode === 'chat' ? '#E50914' : 'transparent', color: mode === 'chat' ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                <MessageCircle size={11} /> Chat
              </button>
              <button onClick={() => setMode('quiz')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all" style={{ background: mode === 'quiz' ? '#E50914' : 'transparent', color: mode === 'quiz' ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                <Brain size={11} /> Quiz
              </button>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        {mode === 'quiz' ? <QuizMode /> : (
          <>
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
                    {msg.uploadedImage && <img src={msg.uploadedImage} alt="uploaded" className="rounded-xl w-full max-w-xs mb-2 border border-white/20" />}
                    {msg.role === 'user' ? <p className="text-sm leading-relaxed">{msg.content}</p> : <MarkdownContent content={msg.content} />}
                    {msg.imageUrl && msg.imagePrompt && <GeneratedImage url={msg.imageUrl} prompt={msg.imagePrompt} />}
                    <p className="text-[10px] mt-2 opacity-25">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 flex items-center justify-center flex-shrink-0 mt-1"><Sparkles size={13} className="text-[#E50914]" /></div>
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
                {['Explain a concept', 'Help with maths', 'Draw a diagram', 'Summarize a topic'].map(p => (
                  <button key={p} onClick={() => setInput(p + ': ')} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/8 text-white/30 hover:text-white/60 hover:border-white/20 transition-all whitespace-nowrap flex-shrink-0">{p}</button>
                ))}
              </div>

              {/* Uploaded image preview */}
              {uploadedImage && (
                <div className="flex items-center gap-2 mb-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2">
                  <img src={`data:image/jpeg;base64,${uploadedImage}`} alt="preview" className="w-8 h-8 rounded-lg object-cover" />
                  <span className="text-xs text-white/50 truncate flex-1">{uploadedName}</span>
                  <button onClick={() => { setUploadedImage(null); setUploadedName(''); }} className="text-white/30 hover:text-white/60">
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="flex gap-2 items-end">
                {/* Upload button */}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)', color: uploadedImage ? '#E50914' : 'rgba(255,255,255,0.3)' }}
                  title="Upload image"
                >
                  <Paperclip size={16} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask anything... or upload an image to analyse"
                  rows={1}
                  className="flex-1 bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 px-4 py-3 rounded-xl outline-none resize-none transition-all focus:border-[#E50914]/40 focus:bg-white/8"
                  style={{ fontFamily: 'Inter, sans-serif', maxHeight: '120px' }}
                  onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
                />

                <button
                  onClick={sendMessage}
                  disabled={(!input.trim() && !uploadedImage) || loading}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
                  style={{ background: '#E50914', boxShadow: (input.trim() || uploadedImage) ? '0 4px 15px rgba(229,9,20,0.35)' : 'none' }}
                >
                  <Send size={16} className="text-white" />
                </button>
              </div>
              <p className="text-[10px] text-white/15 mt-2 text-center">Enter to send · Shift+Enter for new line · 📎 to upload images</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}