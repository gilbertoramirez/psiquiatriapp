'use client';

import { useState, useEffect, useCallback } from 'react';
import { blog } from '@/lib/api';
import { BlogPost } from '@/types';

const CATEGORIES = [
  { value: 'research', label: 'Investigación' },
  { value: 'wellness', label: 'Bienestar' },
  { value: 'medication', label: 'Medicación' },
  { value: 'therapy', label: 'Terapia' },
  { value: 'news', label: 'Noticias' },
];

const categoryColors: Record<string, string> = {
  research: 'bg-primary-50 text-primary-700',
  wellness: 'bg-salmon-50 text-salmon-700',
  medication: 'bg-red-50 text-red-700',
  therapy: 'bg-orange-50 text-orange-700',
  news: 'bg-gray-100 text-gray-700',
};

export default function DoctorBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'research',
    tags: '',
    published: true,
  });

  const loadPosts = useCallback(async () => {
    try {
      const data = await blog.list();
      setPosts(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await blog.create({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setMessage({ type: 'success', text: 'Publicación creada exitosamente' });
      setShowEditor(false);
      setForm({ title: '', content: '', excerpt: '', category: 'research', tags: '', published: true });
      loadPosts();
    } catch {
      setMessage({ type: 'error', text: 'Error al crear publicación' });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selected || !replyComment.trim()) return;
    setLoading(true);
    try {
      const newComment = await blog.comment(selected.id, replyComment);
      setSelected(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
      setReplyComment('');
      loadPosts();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog de Investigación</h1>
          <p className="text-gray-500 text-sm mt-1">Publica artículos e interactúa con tus pacientes</p>
        </div>
        <button onClick={() => { setShowEditor(!showEditor); setSelected(null); }} className="btn-primary">
          {showEditor ? 'Ver Publicaciones' : '+ Nueva Publicación'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-primary-50 text-primary-700 border border-primary-200'}`}>
          {message.text}
        </div>
      )}

      {showEditor ? (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Nueva Publicación</h3>
          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <label className="label-field">Título</label>
              <input type="text" className="input-field" placeholder="Título del artículo" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>

            <div>
              <label className="label-field">Extracto / Resumen</label>
              <input type="text" className="input-field" placeholder="Breve descripción del artículo (se muestra en la lista)" value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />
            </div>

            <div>
              <label className="label-field">Contenido</label>
              <textarea className="input-field h-64 resize-y" placeholder="Escribe tu artículo aquí..."
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Categoría</label>
                <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Etiquetas (separadas por coma)</label>
                <input type="text" className="input-field" placeholder="ansiedad, terapia, mindfulness" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })}
                  className="w-4 h-4 text-salmon-500 rounded border-gray-300 focus:ring-salmon-400" />
                <span className="text-sm text-gray-700">Publicar inmediatamente</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Publicando...' : form.published ? 'Publicar Artículo' : 'Guardar Borrador'}
              </button>
              <button type="button" onClick={() => setShowEditor(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      ) : selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-salmon-500 hover:text-salmon-600 mb-4 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>

          <article className="card border-t-4 border-t-salmon-300 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[selected.category]}`}>
                {CATEGORIES.find(c => c.value === selected.category)?.label}
              </span>
              {!selected.published && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">Borrador</span>}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selected.title}</h2>
            <p className="text-sm text-gray-400 mb-6">{new Date(selected.publishedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.content}</div>
          </article>

          {/* Comments section */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Comentarios ({selected.comments.length})</h3>

            <div className="space-y-4 mb-6">
              {selected.comments.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay comentarios aún</p>
              ) : (
                selected.comments.map(c => (
                  <div key={c.id} className={`flex gap-3 p-3 rounded-lg ${c.userRole === 'doctor' ? 'bg-salmon-50' : 'bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      c.userRole === 'doctor' ? 'bg-salmon-200 text-salmon-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {c.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.userName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.userRole === 'doctor' ? 'bg-salmon-100 text-salmon-700' : 'bg-gray-200 text-gray-600'}`}>
                          {c.userRole === 'doctor' ? 'Doctor' : 'Paciente'}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('es-MX')}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input type="text" className="input-field flex-1" placeholder="Responder comentario..."
                value={replyComment} onChange={e => setReplyComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReply()} />
              <button onClick={handleReply} disabled={loading || !replyComment.trim()} className="btn-primary px-4">
                Responder
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="card text-center py-16">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              <p className="text-gray-500 font-medium">No has creado publicaciones</p>
              <button onClick={() => setShowEditor(true)} className="btn-primary mt-4">Crear Primera Publicación</button>
            </div>
          ) : (
            posts.map(post => (
              <button key={post.id} onClick={() => setSelected(post)} className="card w-full text-left hover:shadow-md transition-shadow border-l-4 border-l-salmon-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[post.category]}`}>
                    {CATEGORIES.find(c => c.value === post.category)?.label}
                  </span>
                  {!post.published && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">Borrador</span>}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>{new Date(post.publishedAt).toLocaleDateString('es-MX')}</span>
                  <span>{post.comments.length} comentario(s)</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
