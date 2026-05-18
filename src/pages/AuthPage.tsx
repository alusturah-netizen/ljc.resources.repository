import { useState, FormEvent } from 'react';
import { Vault, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup';

function getRoleHint(email: string): 'student' | 'teacher' | null {
  if (!email.includes('@')) return null;
  if (/^[a-zA-Z]+\d{4}@loyolajesuit\.org$/i.test(email)) return 'student';
  if (/^[a-zA-Z]+@loyolajesuit\.org$/i.test(email)) return 'teacher';
  return null;
}

function validateSignUpEmail(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) return { valid: false, error: 'Email is required' };
  if (!email.toLowerCase().endsWith('@loyolajesuit.org'))
    return { valid: false, error: 'Please use your official school email.' };
  const localPart = email.split('@')[0];
  const isValidTeacher = /^[a-zA-Z]+$/.test(localPart);
  const isValidStudent = /^[a-zA-Z]+\d{4}$/.test(localPart);
  if (!isValidTeacher && !isValidStudent)
    return { valid: false, error: 'Email format invalid. Use letters or letters+4 digits before @loyolajesuit.org' };
  return { valid: true };
}

const ROLE_COLORS = { student: '#3B82F6', teacher: '#10B981' };

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleHint = getRoleHint(email);
  const signupValidation = mode === 'signup' ? validateSignUpEmail(email) : { valid: true };
  const isSubmitDisabled = mode === 'signup' && !signupValidation.valid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      const validation = validateSignUpEmail(email);
      if (!validation.valid) {
        setError(validation.error || 'Invalid email');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        // With email confirmation OFF, Supabase returns a session immediately.
        // AuthContext will detect the session and redirect to Library automatically.
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Auth error:', err);
      // Show friendlier error messages
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('database error')) {
        setError('Account setup failed. Please try again in a moment.');
      } else if (msg.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(229,9,20,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl bg-[#E50914] flex items-center justify-center mb-4 shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(229,9,20,0.4)' }}
          >
            <Vault size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.05em' }}>
            Scholar<span className="text-[#E50914]">Vault</span>
          </h1>
          <p className="text-xs text-white/30 mt-1 tracking-widest uppercase">Academic Resource Library</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border border-white/8 p-8"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)' }}
        >
          {/* Mode tabs */}
          <div className="flex rounded-2xl bg-white/5 p-1 mb-8 gap-1">
            {(['login', 'signup'] as AuthMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className="flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-200"
                style={{
                  letterSpacing: '-0.02em',
                  background: mode === m ? '#E50914' : 'transparent',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">School Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="yourname1234@loyolajesuit.org"
                  className="w-full bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all duration-200 focus:border-white/20 focus:bg-white/8"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
              {mode === 'signup' && !signupValidation.valid && (
                <div className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg mt-1 bg-red-500/10 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-400" />
                  {signupValidation.error}
                </div>
              )}
              {roleHint && signupValidation.valid && (
                <div
                  className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg mt-1"
                  style={{ background: `${ROLE_COLORS[roleHint]}15`, color: ROLE_COLORS[roleHint] }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: ROLE_COLORS[roleHint] }} />
                  Detected role: <span className="capitalize">{roleHint}</span>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  className="w-full bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 pl-11 pr-12 py-3.5 rounded-xl outline-none transition-all duration-200 focus:border-white/20 focus:bg-white/8"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isSubmitDisabled}
              className="w-full py-3.5 rounded-xl text-sm font-black transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                background: (loading || isSubmitDisabled) ? 'rgba(229,9,20,0.5)' : '#E50914',
                color: '#fff',
                letterSpacing: '-0.02em',
                boxShadow: (loading || isSubmitDisabled) ? 'none' : '0 8px 30px rgba(229,9,20,0.3)',
              }}
              title={isSubmitDisabled ? signupValidation.error : undefined}
            >
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign In to Vault' : 'Create Account')}
            </button>
          </form>
        </div>

        {/* Domain notice */}
        <p className="text-center text-[11px] text-white/20 mt-6 leading-relaxed px-4">
          This library is restricted to{' '}
          <span className="text-white/40 font-semibold">@loyolajesuit.org</span>{' '}
          accounts only.
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}