import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

function calculateSeverity(type: string, score: number): string {
  if (type === 'PHQ9') {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    if (score <= 19) return 'moderately_severe';
    return 'severe';
  }
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);

  if (user.role === 'patient') {
    const questionnaires = await prisma.clinicalQuestionnaire.findMany({
      where: { patientId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(questionnaires);
  }

  if (user.role === 'doctor') {
    const patientId = searchParams.get('patientId');
    if (!patientId) return NextResponse.json({ error: 'patientId requerido' }, { status: 400 });

    const questionnaires = await prisma.clinicalQuestionnaire.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(questionnaires);
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'patient') return NextResponse.json({ error: 'Solo pacientes' }, { status: 403 });

  try {
    const { type, answers } = await request.json();

    if (!type || !['PHQ9', 'GAD7'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de cuestionario invalido' }, { status: 400 });
    }

    const expectedLength = type === 'PHQ9' ? 9 : 7;
    if (!Array.isArray(answers) || answers.length !== expectedLength) {
      return NextResponse.json({ error: `Se requieren ${expectedLength} respuestas` }, { status: 400 });
    }

    if (answers.some((a: number) => typeof a !== 'number' || a < 0 || a > 3)) {
      return NextResponse.json({ error: 'Las respuestas deben ser valores entre 0 y 3' }, { status: 400 });
    }

    const score = answers.reduce((sum: number, a: number) => sum + a, 0);
    const severity = calculateSeverity(type, score);
    const date = new Date().toISOString().split('T')[0];

    const questionnaire = await prisma.clinicalQuestionnaire.create({
      data: {
        patientId: user.id,
        type,
        date,
        answers,
        score,
        severity,
      },
    });

    return NextResponse.json(questionnaire, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear cuestionario' }, { status: 500 });
  }
}
