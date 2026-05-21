import { useState, FormEvent } from 'react';
import { Vault, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgot';

function getRoleHint(email: string): 'student' | 'teacher' | null {
  if (!email.includes('@')) return null;
  if (/^[a-zA-Z]+\d{4}@loyolajesuit\.org$/i.test(email)) return 'student';
  if (/^[a-zA-Z]+@loyolajesuit\.org$/i.test(email)) return 'teacher';
  return null;
}

function getRole(email: string): 'student' | 'teacher' {
  return /^[a-zA-Z]+\d{4}@loyolajesuit\.org$/i.test(email) ? 'student' : 'teacher';
}

function validateSignUpEmail(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) return { valid: false, error: 'Email is required' };
  if (!email.toLowerCase().endsWith('@loyolajesuit.org'))
    return { valid: false, error: 'Please use your official school email.' };
  const localPart = email.split('@')[0];
  if (!/^[a-zA-Z]+$/.test(localPart) && !/^[a-zA-Z]+\d{4}$/.test(localPart))
    return { valid: false, error: 'Email format invalid. Use letters or letters+4 digits before @loyolajesuit.org' };
  return { valid: true };
}

const ROLE_COLORS = { student: '#3B82F6', teacher: '#10B981' };

// Google "G" logo SVG
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roleHint = getRoleHint(email);
  const signupValidation = mode === 'signup' ? validateSignUpEmail(email) : { valid: true };
  const isSubmitDisabled = mode === 'signup' && !signupValidation.valid;

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError('Google sign in failed. Please try again.');
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password reset link sent! Check your email inbox.');
    }
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'forgot') { handleForgotPassword(e); return; }

    if (mode === 'signup') {
      const validation = validateSignUpEmail(email);
      if (!validation.valid) { setError(validation.error || 'Invalid email'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.user) {
          const role = getRole(email);
          const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, email, role });
          if (profileError) console.warn('Profile creation failed:', profileError.message);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      if (msg.toLowerCase().includes('invalid login credentials')) setError('Incorrect email or password. Please try again.');
      else if (msg.toLowerCase().includes('already registered')) setError('This email is already registered. Try signing in instead.');
      else if (msg.toLowerCase().includes('database error')) setError('Account setup failed. Please try again in a moment.');
      else setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(229,9,20,0.12) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#E50914] flex items-center justify-center mb-4 shadow-2xl" style={{ boxShadow: '0 0 40px rgba(229,9,20,0.4)' }}>
            <Vault size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.05em' }}>
            Scholar<span className="text-[#E50914]">Vault</span>
          </h1>
          <p className="text-xs text-white/30 mt-1 tracking-widest uppercase">Academic Resource Library</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/8 p-8" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)' }}>

          {/* Forgot password screen */}
          {mode === 'forgot' ? (
            <div>
              <button onClick={() => { setMode('login'); setError(null); setSuccess(null); }} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors mb-6">
                <ArrowLeft size={13} /> Back to sign in
              </button>
              <h2 className="text-lg font-black text-white mb-1" style={{ letterSpacing: '-0.04em' }}>Reset Password</h2>
              <p className="text-sm text-white/40 mb-6">Enter your school email and we'll send you a reset link.</p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">School Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="yourname1234@loyolajesuit.org"
                      className="w-full bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all focus:border-white/20" />
                  </div>
                </div>

                {error && <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"><AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" /><p className="text-xs text-red-400">{error}</p></div>}
                {success && <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3"><p className="text-xs text-emerald-400">{success}</p></div>}

                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-50" style={{ background: '#E50914', boxShadow: '0 8px 30px rgba(229,9,20,0.3)' }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex rounded-2xl bg-white/5 p-1 mb-6 gap-1">
                {(['login', 'signup'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                    className="flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-200"
                    style={{ letterSpacing: '-0.02em', background: mode === m ? '#E50914' : 'transparent', color: mode === m ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Google sign in */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all mb-4 disabled:opacity-50"
              >
                <GoogleIcon />
                {googleLoading ? 'Connecting...' : `Continue with Google`}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[11px] text-white/20 font-semibold">or</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">School Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="yourname1234@loyolajesuit.org"
                      className="w-full bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all focus:border-white/20 focus:bg-white/8" />
                  </div>
                  {mode === 'signup' && !signupValidation.valid && (
                    <div className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg mt-1 bg-red-500/10 text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-400" />{signupValidation.error}
                    </div>
                  )}
                  {roleHint && signupValidation.valid && (
                    <div className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg mt-1" style={{ background: `${ROLE_COLORS[roleHint]}15`, color: ROLE_COLORS[roleHint] }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: ROLE_COLORS[roleHint] }} />
                      Detected role: <span className="capitalize">{roleHint}</span>
                    </div>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                        className="text-[11px] text-white/30 hover:text-[#E50914] transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                      placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                      className="w-full bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 pl-11 pr-12 py-3.5 rounded-xl outline-none transition-all focus:border-white/20 focus:bg-white/8" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"><AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" /><p className="text-xs text-red-400 leading-relaxed">{error}</p></div>}

                <button type="submit" disabled={loading || isSubmitDisabled}
                  className="w-full py-3.5 rounded-xl text-sm font-black transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  style={{ background: (loading || isSubmitDisabled) ? 'rgba(229,9,20,0.5)' : '#E50914', color: '#fff', letterSpacing: '-0.02em', boxShadow: (loading || isSubmitDisabled) ? 'none' : '0 8px 30px rgba(229,9,20,0.3)' }}>
                  {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In to Vault' : 'Create Account')}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-white/20 mt-6 leading-relaxed px-4">
          This library is restricted to <span className="text-white/40 font-semibold">@loyolajesuit.org</span> accounts only.
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}