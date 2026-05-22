import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
  role: 'student' | 'teacher';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', uid)
        .maybeSingle();
      setProfile(data as Profile | null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) {
            await fetchProfile(s.user.id);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (isMounted) {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          (async () => {
            await fetchProfile(s.user.id);
          })();
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
