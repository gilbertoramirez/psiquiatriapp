'use client';

import { useState, useEffect, useCallback } from 'react';
import { blog } from '@/lib/api';
import { BlogPost } from '@/types';

const categoryLabels: Record<string, string> = {
  research: 'Investigación',
  wellness: 'Bienestar',
  medication: 'Medicación',
  therapy: 'Terapia',
  news: 'Noticias',
};

const categoryColors: Record<string, string> = {
  research: 'bg-primary-50 text-primary-700 border-primary-200',
  wellness: 'bg-salmon-50 text-salmon-700 border-salmon-200',
  medication: 'bg-red-50 text-red-700 border-red-200',
  therapy: 'bg-orange-50 text-orange-700 border-orange-200',
  news: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function PatientBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const data = await blog.list();
      setPosts(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleComment = async () => {
    if (!selected || !comment.trim()) return;
    setLoading(true);
    try {
      const newComment = await blog.comment(selected.id, comment);
      const updatedPost = { ...selected, comments: [...selected.comments, newComment] };
      setSelected(updatedPost);
      setPosts(prev => prev.map(p => p.id === selected.id ? updatedPost : p));
      setComment('');
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog de Investigación</h1>
        <p className="text-gray-500 text-sm mt-1">Artículos y recursos de nuestros especialistas</p>
      </div>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-salmon-500 hover:text-salmon-600 mb-4 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver al blog
          </button>

          <article className="card border-t-4 border-t-salmon-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryColors[selected.category]}`}>
                  {categoryLabels[selected.category]}
                </span>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">{selected.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-salmon-100 rounded-full flex items-center justify-center text-salmon-700 font-bold text-xs">
                  {selected.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span className="font-medium text-gray-700">{selected.doctorName}</span>
              </div>
              <span>|</span>
              <span>{new Date(selected.publishedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {selected.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">#{tag}</span>
                ))}
              </div>
            )}

            <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap mb-8">
              {selected.content}
            </div>

            {/* Comments */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Comentarios ({selected.comments.length})
              </h3>

              <div className="space-y-4 mb-6">
                {selected.comments.length === 0 ? (
                  <p className="text-gray-400 text-sm">Sé el primero en comentar</p>
                ) : (
                  selected.comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        c.userRole === 'doctor' ? 'bg-salmon-100 text-salmon-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{c.userName}</span>
                          {c.userRole === 'doctor' && (
                            <span className="bg-salmon-100 text-salmon-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Doctor</span>
                          )}
                          <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('es-MX')}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input type="text" className="input-field flex-1" placeholder="Escribe un comentario..."
                  value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()} />
                <button onClick={handleComment} disabled={loading || !comment.trim()} className="btn-primary px-4">
                  {loading ? '...' : 'Enviar'}
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="card text-center py-16">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              <p className="text-gray-500 font-medium">No hay publicaciones aún</p>
              <p className="text-gray-400 text-sm mt-1">Los artículos de investigación aparecerán aquí</p>
            </div>
          ) : (
            posts.map(post => (
              <button key={post.id} onClick={() => setSelected(post)} className="card w-full text-left hover:shadow-md transition-shadow border-l-4 border-l-salmon-300">
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryColors[post.category]}`}>
                    {categoryLabels[post.category]}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(post.publishedAt).toLocaleDateString('es-MX')}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-2 mb-1">{post.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{post.doctorName}</span>
                  <span className="text-xs text-gray-400">{post.comments.length} comentario(s)</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
