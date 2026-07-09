import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('id');

  if (postId) {
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      include: { comments: true },
    });
    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    return NextResponse.json(post);
  }

  const user = getToken(request);

  const posts = await prisma.blogPost.findMany({
    where: user?.role === 'doctor'
      ? { OR: [{ doctorId: user.id }, { published: true }] }
      : { published: true },
    include: { comments: true },
    orderBy: { publishedAt: 'desc' },
  });

  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores pueden crear publicaciones' }, { status: 403 });

  try {
    const { title, content, excerpt, category, tags, published } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Título y contenido son requeridos' }, { status: 400 });
    }

    const post = await prisma.blogPost.create({
      data: {
        doctorId: user.id,
        doctorName: user.name,
        title,
        content,
        excerpt: excerpt || content.substring(0, 150) + '...',
        category: category || 'wellness',
        tags: tags || [],
        published: published !== false,
      },
      include: { comments: true },
    });

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear publicación' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { postId, content } = await request.json();

    if (!postId || !content) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });

    const comment = await prisma.blogComment.create({
      data: {
        postId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        content,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al agregar comentario' }, { status: 500 });
  }
}
