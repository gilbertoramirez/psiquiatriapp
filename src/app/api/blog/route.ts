import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { BlogPost, BlogComment } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

// GET - list all published posts or single post by id
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('id');

  if (postId) {
    const post = db.blogPosts.find(p => p.id === postId);
    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    return NextResponse.json(post);
  }

  // Check if user is authenticated to show drafts for doctors
  const user = getToken(request);
  let posts: BlogPost[];

  if (user?.role === 'doctor') {
    // Doctors see all their posts (including drafts) + published posts from others
    posts = db.blogPosts.filter(p => p.doctorId === user.id || p.published);
  } else {
    // Everyone else sees only published posts
    posts = db.blogPosts.filter(p => p.published);
  }

  return NextResponse.json(posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
}

// POST - create a new blog post (doctors only)
export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores pueden crear publicaciones' }, { status: 403 });

  try {
    const { title, content, excerpt, category, tags, published } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Título y contenido son requeridos' }, { status: 400 });
    }

    const post: BlogPost = {
      id: `blog-${uuidv4()}`,
      doctorId: user.id,
      doctorName: user.name,
      title,
      content,
      excerpt: excerpt || content.substring(0, 150) + '...',
      category: category || 'wellness',
      tags: tags || [],
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      published: published !== false,
      comments: [],
    };

    db.blogPosts.push(post);
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear publicación' }, { status: 500 });
  }
}

// PATCH - add a comment to a post (both doctors and patients)
export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { postId, content } = await request.json();

    if (!postId || !content) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const post = db.blogPosts.find(p => p.id === postId);
    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });

    const comment: BlogComment = {
      id: `com-${uuidv4()}`,
      postId,
      userId: user.id,
      userName: user.name,
      userRole: user.role as 'patient' | 'doctor',
      content,
      createdAt: new Date().toISOString(),
    };

    post.comments.push(comment);
    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al agregar comentario' }, { status: 500 });
  }
}
