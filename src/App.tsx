import { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, BookOpen, FlaskConical, Palette, Globe,
  ChevronRight, File, Vault, LogOut, GraduationCap, User as UserIcon, Upload as UploadIcon,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import UploadModal from './components/UploadModal';

interface Resource {
  id: string;
  title: string;
  category: string;
  file_url: string;
  access_level: string;
}

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

// 1. Update line 75 to accept the state setter function:
function ResourceCard({ resource, onSelect }: { resource: Resource; onSelect: (r: Resource) => void }) {
  const config = CATEGORY_CONFIG[resource.category as Category];
  const accent = config?.accent ?? '#E50914';

  return (
    // 2. Add the onClick directly to line 80:
    <div 
      onClick={() => onSelect(resource)}
      className="group w-full bg-[#0d0d0d] rounded-2xl border border-white/5 p-4 transition-all duration-300 hover:scale-[1.05] hover:border-white/20 hover:shadow-2xl cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Cover Image Wrapper */}
        <div className="aspect-[3/4] w-full bg-zinc-900 rounded-xl relative overflow-hidden mb-4">
          <img 
            src={resource.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500"} 
            alt={resource.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span 
              className="text-xs text-white px-3 py-1.5 rounded-md font-bold tracking-wide w-full text-center transition-transform transform translate-y-2 group-hover:translate-y-0 duration-300"
              style={{ backgroundColor: accent }}
            >
              Open Resource
            </span>
          </div>
        </div>

        {/* Resource Meta */}
        <span 
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: accent }}
        >
          {resource.category}
        </span>
        <h3 className="text-white font-extrabold text-base mt-1 line-clamp-2 group-hover:text-[#E50914] transition-colors duration-200">
          {resource.title}
        </h3>
      </div>
      
      <p className="text-zinc-500 text-xs truncate mt-2 font-medium">
        By {resource.author || "Academic Board"}
      </p>
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
interface LibraryProps {
  selectedResource: Resource | null;
  setSelectedResource: (resource: Resource | null) => void;
}

function Library({ selectedResource, setSelectedResource }: LibraryProps) {
  const { profile, signOut } = useAuth();
  const isTeacher = profile?.role === 'teacher';

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [searching, setSearching] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  // Line 272 duplicate state deleted!
  
 async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from('resources')
      .select('*') 
      .order('id', { ascending: false });
      
    setAllResources(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, [isTeacher]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('resources')
      .select('id, title, category, file_url, access_level')
      .or(`title.ilike.%${q}%,category.eq.${q}`)
      .order('id', { ascending: false });
    setSearchResults(data ?? []);
    setSearching(false);
  }, [isTeacher]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 280);
    return () => clearTimeout(t);
  }, [query, doSearch]);

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

  const roleColor = isTeacher ? '#10B981' : '#3B82F6';
  const RoleIcon = isTeacher ? UserIcon : GraduationCap;

 return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      
      {/* 🟢 PASTE THIS EXACTLY HERE: */}
      <ResourceModal 
        resource={selectedResource} 
        onClose={() => setSelectedResource(null)} 
      />

      {/* Leave all your existing code exactly as it is below this line! */}
      {/* (Your header, navigation, and book grids) */}
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

          <div className="flex items-center gap-3">
            {isTeacher && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:brightness-110 active:scale-95"
                style={{ background: '#E50914', color: '#fff' }}
              >
                <UploadIcon size={13} />
                Upload
              </button>
            )}
            <div
              className="hidden sm:flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${roleColor}15`, color: roleColor }}
            >
              <RoleIcon size={12} />
              <span className="capitalize">{profile?.role ?? 'user'}</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors duration-200 px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
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
            style={{ letterSpacing: '-0.05em' }}
          >
            Your Academic<br />
            <span className="text-[#E50914]">Library.</span> Reimagined.
          </h1>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
            {isTeacher
              ? 'Full access to all curated resources across every subject and access level.'
              : 'Curated resources across Mathematics, Science, Art, and Social Sciences.'}
          </p>

          {/* Search */}
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
                style={{ letterSpacing: '-0.01em' }}
              />
              {query && (
                <button
                  onMouseDown={e => { e.preventDefault(); setQuery(''); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs transition-colors w-5 h-5 flex items-center justify-center"
                >
                  x
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Search Results */}
        {isSearching && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-black text-white" style={{ letterSpacing: '-0.04em' }}>
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
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 w-full">
              {filteredResources.map((resource) => (
  <ResourceCard 
    key={resource.id} 
    resource={resource} 
    onSelect={setSelectedResource} // Pass the state setter function here!
  />
))}
              </div>
            )}
          </section>
        )}

        {/* Bento + Rows */}
        {!isSearching && (
          <>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-white" style={{ letterSpacing: '-0.04em' }}>Browse by Subject</h2>
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

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchAll}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#E50914] flex items-center justify-center">
              <Vault size={10} className="text-white" />
            </div>
            <span className="text-xs font-black text-white/40" style={{ letterSpacing: '-0.04em' }}>ScholarVault 2.0</span>
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

export default function App() {
  const { session, loading } = useAuth();
  // Place your state line right here, cleanly nested inside the function:
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  if (loading) {
    return (

      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E50914] flex items-center justify-center animate-pulse">
            <Vault size={22} className="text-white" />
          </div>
          <p className="text-xs text-white/30 tracking-widest uppercase">Loading vault...</p>
        </div>
  
    );
  }

  if (!session) {
    return <AuthPage />;
  }

return <Library onSelectResource={setSelectedResource} selectedResource={selectedResource} setSelectedResource={setSelectedResource} />;
}
// ... Line 578:
  return <Library selectedResource={selectedResource} setSelectedResource={setSelectedResource} />;
} // <--- THIS bracket on line 579 closes your entire App() function.

// ==========================================
// 🟢 PASTE THE ENTIRE CODE BLOCK BELOW HERE (OUTSIDE OF APP)
// ==========================================

function ResourceModal({ 
  resource, 
  onClose 
}: { 
  resource: any; 
  onClose: () => void; 
}) {
  if (!resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Box Container */}
      <div className="relative bg-[#0d0d0d] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Side: Large Cover Image */}
        <div className="w-full md:w-1/2 aspect-[3/4] bg-zinc-900 relative">
          <img 
            src={resource.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500"} 
            alt={resource.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Side: Text & Download Action */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-[#121212]">
          <div>
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-white/5 p-2 rounded-full text-sm"
            >
              ✕
            </button>

            <span className="text-xs font-bold text-[#E50914] uppercase tracking-widest">
              {resource.category}
            </span>
            <h2 className="text-white font-extrabold text-2xl mt-2 leading-tight">
              {resource.title}
            </h2>
            <p className="text-zinc-400 text-sm mt-2 font-medium">
              By {resource.author || "Academic Board"}
            </p>
          </div>

          {/* Download Button Area (Only visible on card click modal!) */}
          <div className="mt-8 space-y-3">
            <a 
              href={resource.file_url || "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-[#E50914] hover:bg-[#b80710] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 block text-center"
            >
              Download Resource
            </a>
            <button 
              onClick={onClose}
              className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold py-2.5 px-4 rounded-xl transition-all text-xs"
            >
              Back to Library
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}