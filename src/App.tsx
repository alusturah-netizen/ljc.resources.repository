import { useState, useEffect, useCallback } from 'react';
import { Search, Download, BookOpen, FlaskConical, Palette, Globe, ChevronRight, File, Vault } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface Resource {
  id: string;
  title: string;
  category: string;
  file_url: string;
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const CATEGORIES = ['Mathematics', 'Science', 'Art', 'Social Sciences'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_CONFIG: Record<Category, {
  icon: React.ElementType;
  gradient: string;
  accent: string;
  description: string;
}> = {
  Mathematics: {
    icon: BookOpen,
    gradient: 'from-blue-950/80 via-blue-900/40 to-transparent',
    accent: '#3B82F6',
    description: 'Calculus, Algebra, Statistics & more',
  },
  Science: {
    icon: FlaskConical,
    gradient: 'from-emerald-950/80 via-emerald-900/40 to-transparent',
    accent: '#10B981',
    description: 'Physics, Chemistry, Biology & more',
  },
  Art: {
    icon: Palette,
    gradient: 'from-amber-950/80 via-amber-900/40 to-transparent',
    accent: '#F59E0B',
    description: 'Design, Typography, Art History & more',
  },
  'Social Sciences': {
    icon: Globe,
    gradient: 'from-rose-950/80 via-rose-900/40 to-transparent',
    accent: '#F43F5E',
    description: 'Economics, History, Sociology & more',
  },
};

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#EF4444', fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
          {message.includes('Keys') ? 'Supabase Keys Missing' : 'Connection Error'}
        </h1>
        <p style={{
          color: '#EF4444',
          fontSize: '14px',
          fontFamily: 'monospace',
          lineHeight: '1.6',
          padding: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          marginBottom: '16px',
          wordBreak: 'break-word',
        }}>
          {message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#E50914',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-56 rounded-2xl border border-white/5 bg-white/3 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/10 mb-3" />
      <div className="h-3 bg-white/10 rounded mb-2 w-3/4" />
      <div className="h-3 bg-white/10 rounded mb-4 w-1/2" />
      <div className="h-2 bg-white/10 rounded mb-1 w-full" />
      <div className="h-2 bg-white/10 rounded w-2/3" />
      <div className="mt-4 h-8 bg-white/10 rounded-lg" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const config = CATEGORY_CONFIG[resource.category as Category];
  const accent = config?.accent ?? '#E50914';

  return (
    <div
      className="group flex-shrink-0 w-56 rounded-2xl border border-white/5 bg-[#0d0d0d] p-4 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-2xl cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${accent}22`, color: accent }}
      >
        <File size={20} />
      </div>

      <h3 className="text-sm font-bold text-white leading-snug mb-2 line-clamp-3" style={{ letterSpacing: '-0.02em' }}>
        {resource.title}
      </h3>

      <p className="text-[11px] text-white/40 mb-4">{resource.category}</p>

      <div className="flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 hover:brightness-110"
          style={{ background: '#E50914', color: '#fff' }}
          onClick={() => resource.file_url && window.open(resource.file_url, '_blank')}
        >
          <Download size={12} />
          Download
        </button>
      </div>
    </div>
  );
}

function VaultEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mb-4">
        <Vault size={28} className="text-white/20" />
      </div>
      <h3 className="text-sm font-bold text-white/40 mb-1" style={{ letterSpacing: '-0.03em' }}>Vault Empty</h3>
      <p className="text-xs text-white/20">No resources found in this category.</p>
    </div>
  );
}

interface CategoryRowProps {
  category: Category;
  resources: Resource[];
  loading: boolean;
  onCategoryClick: (cat: Category) => void;
  activeCategory: Category | null;
}

function CategoryRow({ category, resources, loading, onCategoryClick, activeCategory }: CategoryRowProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const isActive = activeCategory === category;

  return (
    <section>
      <button
        onClick={() => onCategoryClick(category)}
        className="group flex items-center gap-3 mb-4 w-full text-left hover:opacity-80 transition-opacity"
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ background: `${config.accent}22`, color: config.accent }}
        >
          <Icon size={16} />
        </div>
        <div>
          <h2 className="text-base font-black text-white" style={{ letterSpacing: '-0.04em' }}>{category}</h2>
          <p className="text-[11px] text-white/30">{config.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!loading && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${config.accent}22`, color: config.accent }}
            >
              {resources.length} resources
            </span>
          )}
          <ChevronRight
            size={16}
            className="text-white/20 transition-transform duration-200 group-hover:translate-x-1"
            style={{ transform: isActive ? 'rotate(90deg)' : undefined }}
          />
        </div>
      </button>

      {loading ? (
        <SkeletonGrid />
      ) : resources.length === 0 ? (
        <VaultEmpty />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {resources.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>
      )}
    </section>
  );
}

interface BentoGridProps {
  counts: Record<string, number>;
  loading: boolean;
  onSelect: (cat: Category) => void;
  active: Category | null;
}

function BentoGrid({ counts, loading, onSelect, active }: BentoGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CATEGORIES.map(cat => {
        const config = CATEGORY_CONFIG[cat];
        const Icon = config.icon;
        const isActive = active === cat;

        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`group relative overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
              isActive ? 'border-white/20 shadow-2xl scale-[1.02]' : 'border-white/5'
            }`}
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${config.accent}25, ${config.accent}08)`
                : 'rgba(255,255,255,0.03)',
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-60`} />
            <div className="relative z-10">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${config.accent}22`, color: config.accent }}
              >
                <Icon size={20} />
              </div>
              <h3 className="text-sm font-black text-white mb-0.5" style={{ letterSpacing: '-0.04em' }}>{cat}</h3>
              <p className="text-[11px] text-white/40 leading-relaxed mb-3">{config.description}</p>
              {loading ? (
                <div className="h-5 w-20 rounded-full bg-white/10 animate-pulse" />
              ) : (
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${config.accent}22`, color: config.accent }}
                >
                  {counts[cat] ?? 0}
                </span>
              )}
            </div>
            {isActive && (
              <div
                className="absolute top-3 right-3 w-2 h-2 rounded-full"
                style={{ background: config.accent }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return <ErrorDisplay message="VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not configured" />;
  }

  if (!supabase) {
    return <ErrorDisplay message="Failed to initialize Supabase client" />;
  }

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('resources')
          .select('id, title, category, file_url')
          .order('id', { ascending: false });

        if (fetchError) {
          throw new Error(`Database Error: ${fetchError.message}`);
        }
        setAllResources(data ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error fetching resources';
        setError(msg);
        console.error('Fetch error:', msg);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const { data, error: searchError } = await supabase
        .from('resources')
        .select('id, title, category, file_url')
        .or(`title.ilike.%${q}%,category.eq.${q}`)
        .order('id', { ascending: false });

      if (searchError) {
        throw new Error(`Search Error: ${searchError.message}`);
      }
      setSearchResults(data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error searching';
      setError(msg);
      console.error('Search error:', msg);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 280);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = allResources.filter(r => r.category === cat).length;
    return acc;
  }, {});

  const byCategory = (cat: Category) => allResources.filter(r => r.category === cat);

  const isSearching = query.trim().length > 0;

  const handleCategorySelect = (cat: Category) => {
    setActiveCategory(prev => prev === cat ? null : cat);
    setTimeout(() => {
      document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E50914] flex items-center justify-center">
              <Vault size={14} className="text-white" />
            </div>
            <span className="text-sm font-black" style={{ letterSpacing: '-0.05em' }}>
              Scholar<span className="text-[#E50914]">Vault</span>
            </span>
            <span className="text-[10px] font-bold text-white/30 border border-white/10 rounded px-1.5 py-0.5 tracking-widest">2.0</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setQuery('');
                  setTimeout(() => {
                    document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
                className="text-xs font-semibold text-white/40 hover:text-white transition-colors duration-200"
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* Hero */}
        <section className="text-center pt-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#E50914] border border-[#E50914]/20 rounded-full px-3 py-1 mb-5 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse inline-block" />
            Academic Resource Vault
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-none"
            style={{ letterSpacing: '-0.05em', fontFamily: 'Inter, sans-serif' }}
          >
            Your Academic<br />
            <span className="text-[#E50914]">Library.</span> Reimagined.
          </h1>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
            Thousands of curated resources across Mathematics, Science, Art, and Social Sciences — all in one vault.
          </p>

          {/* Hero Search */}
          <div className="relative max-w-2xl mx-auto">
            <div
              className="relative rounded-2xl border transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                borderColor: searchFocused ? '#E50914' : 'rgba(255,255,255,0.1)',
                boxShadow: searchFocused
                  ? '0 0 0 3px rgba(229,9,20,0.15), 0 20px 60px rgba(229,9,20,0.1)'
                  : '0 4px 24px rgba(0,0,0,0.4)',
              }}
            >
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                style={{ color: searchFocused ? '#E50914' : 'rgba(255,255,255,0.3)' }}
              />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search by title or category..."
                className="w-full bg-transparent text-white text-sm font-medium placeholder-white/25 pl-12 pr-10 py-4 rounded-2xl outline-none"
                style={{ letterSpacing: '-0.01em', fontFamily: 'Inter, sans-serif' }}
              />
              {query && (
                <button
                  onMouseDown={e => { e.preventDefault(); setQuery(''); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs transition-colors w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Search Results */}
        {isSearching && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-black text-white" style={{ letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
                {searching ? 'Searching vault...' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for`}
              </h2>
              {!searching && (
                <span className="text-base font-black text-[#E50914]" style={{ letterSpacing: '-0.04em' }}>
                  "{query}"
                </span>
              )}
            </div>
            {searching ? (
              <SkeletonGrid />
            ) : searchResults.length === 0 ? (
              <VaultEmpty />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {searchResults.map(r => <ResourceCard key={r.id} resource={r} />)}
              </div>
            )}
          </section>
        )}

        {/* Bento + Rows */}
        {!isSearching && (
          <>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-white" style={{ letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>Browse by Subject</h2>
                {activeCategory && (
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <BentoGrid
                counts={counts}
                loading={loading}
                onSelect={handleCategorySelect}
                active={activeCategory}
              />
            </section>

            <div className="space-y-6">
              {(activeCategory ? [activeCategory] : CATEGORIES).map(cat => (
                <div
                  key={cat}
                  id={`cat-${cat}`}
                  className="rounded-3xl border border-white/5 p-6"
                  style={{ background: 'rgba(255,255,255,0.015)', boxShadow: '0 4px 40px rgba(0,0,0,0.4)' }}
                >
                  <CategoryRow
                    category={cat}
                    resources={byCategory(cat)}
                    loading={loading}
                    onCategoryClick={c => setActiveCategory(prev => prev === c ? null : c)}
                    activeCategory={activeCategory}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#E50914] flex items-center justify-center">
              <Vault size={10} className="text-white" />
            </div>
            <span className="text-xs font-black text-white/40" style={{ letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>ScholarVault 2.0</span>
          </div>
          <p className="text-[11px] text-white/20">Academic excellence, curated.</p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
