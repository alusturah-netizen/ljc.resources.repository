import { useState, FormEvent } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = ['Mathematics', 'Science', 'Art', 'Social Sciences'] as const;
type Category = typeof CATEGORIES[number];

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Mathematics');
  const [accessLevel, setAccessLevel] = useState<'student' | 'teacher'>('student');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function resetForm() {
    setTitle('');
    setCategory('Mathematics');
    setAccessLevel('student');
    setFile(null);
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `resources/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('resources')
        .insert({
          title: title.trim(),
          category,
          access_level: accessLevel,
          file_url: publicUrl,
        });

      if (dbError) throw dbError;

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      console.error('Upload error:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(5,5,5,0.95)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-white" style={{ letterSpacing: '-0.03em' }}>Upload Resource</h2>
          <button
            onClick={handleClose}
            className="text-white/30 hover:text-white/60 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
              <CheckCircle size={24} className="text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-400 font-semibold">Upload complete!</p>
            <p className="text-xs text-white/40 mt-1">Resource added to vault</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Calculus Chapter 3"
                className="w-full bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 px-4 py-3 rounded-xl outline-none transition-all duration-200 focus:border-white/20 focus:bg-white/8"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className="w-full bg-white/5 border border-white/8 text-white text-sm px-4 py-3 rounded-xl outline-none transition-all duration-200 focus:border-white/20 focus:bg-white/8"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-[#050505]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Access Level */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">Access Level</label>
              <div className="flex gap-2">
                {(['student', 'teacher'] as const).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAccessLevel(level)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      accessLevel === level
                        ? 'bg-[#E50914] text-white'
                        : 'bg-white/5 text-white/40 border border-white/8 hover:border-white/20'
                    }`}
                  >
                    {level === 'student' ? 'All Users' : 'Teachers Only'}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/40 tracking-widest uppercase">File</label>
              <label className="relative flex items-center justify-center w-full px-4 py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-colors cursor-pointer bg-white/3 hover:bg-white/5">
                <div className="flex flex-col items-center">
                  <Upload size={20} className="text-white/40 mb-2" />
                  <span className="text-xs font-semibold text-white/40">{file ? file.name : 'Click to upload'}</span>
                  <span className="text-[10px] text-white/20 mt-1">PDF, DOCX, or other</span>
                </div>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  accept="*"
                />
              </label>
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
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-black transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              style={{
                background: loading ? 'rgba(229,9,20,0.5)' : '#E50914',
                color: '#fff',
                letterSpacing: '-0.02em',
              }}
            >
              {loading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
