'use client';

import { useState, useEffect } from 'react';
import { questionnaires as questionnairesApi } from '@/lib/api';

interface Questionnaire {
  id: string;
  type: string;
  date: string;
  answers: number[];
  score: number;
  severity: string;
  createdAt: string;
}

type QuestionnaireType = 'PHQ9' | 'GAD7';

const PHQ9_QUESTIONS = [
  'Poco interes o placer en hacer cosas',
  'Sentirse desanimado/a, deprimido/a, o sin esperanza',
  'Dificultad para dormir, mantenerse dormido/a, o dormir demasiado',
  'Sentirse cansado/a o con poca energia',
  'Poco apetito o comer en exceso',
  'Sentirse mal consigo mismo/a',
  'Dificultad para concentrarse',
  'Moverse o hablar tan lento que otros lo notaron, o lo contrario',
  'Pensamientos de que estaria mejor muerto/a o de hacerse dano',
];

const GAD7_QUESTIONS = [
  'Sentirse nervioso/a, ansioso/a o con los nervios de punta',
  'No ser capaz de parar o controlar las preocupaciones',
  'Preocuparse demasiado por diferentes cosas',
  'Dificultad para relajarse',
  'Estar tan inquieto/a que es dificil quedarse quieto/a',
  'Molestarse o irritarse facilmente',
  'Sentir miedo como si algo terrible fuera a pasar',
];

const ANSWER_OPTIONS = ['Nada', 'Varios dias', 'Mas de la mitad de los dias', 'Casi todos los dias'];

const SEVERITY_LABELS: Record<string, string> = {
  minimal: 'Minimo',
  mild: 'Leve',
  moderate: 'Moderado',
  moderately_severe: 'Moderadamente severo',
  severe: 'Severo',
};

const SEVERITY_COLORS: Record<string, string> = {
  minimal: 'bg-green-100 text-green-800 border-green-300',
  mild: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  moderate: 'bg-orange-100 text-orange-800 border-orange-300',
  moderately_severe: 'bg-red-100 text-red-800 border-red-300',
  severe: 'bg-red-200 text-red-900 border-red-400',
};

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

export default function CuestionariosPage() {
  const [history, setHistory] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<QuestionnaireType | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: string; score: number; severity: string } | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    questionnairesApi.list()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startQuestionnaire = (type: QuestionnaireType) => {
    const length = type === 'PHQ9' ? 9 : 7;
    setAnswers(new Array(length).fill(null));
    setActiveType(type);
    setResult(null);
    setMessage({ type: '', text: '' });
  };

  const cancelQuestionnaire = () => {
    setActiveType(null);
    setAnswers([]);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeType) return;
    if (answers.some(a => a === null)) {
      setMessage({ type: 'error', text: 'Por favor responde todas las preguntas' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await questionnairesApi.create({ type: activeType, answers });
      setResult({ type: activeType, score: data.score, severity: data.severity });
      setHistory(prev => [data, ...prev]);
      setActiveType(null);
      setAnswers([]);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al enviar' });
    } finally {
      setSubmitting(false);
    }
  };

  const questions = activeType === 'PHQ9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const maxScore = activeType === 'PHQ9' ? 27 : 21;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cuestionarios Clinicos</h1>
        <p className="text-gray-500 text-sm mt-1">Evalua tu estado emocional con cuestionarios validados clinicamente</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {result && (
        <div className="card mb-6 border border-salmon-200">
          <h2 className="font-semibold text-lg mb-3">Resultado: {result.type === 'PHQ9' ? 'PHQ-9 (Depresion)' : 'GAD-7 (Ansiedad)'}</h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-3xl font-bold text-gray-900">{result.score}<span className="text-lg text-gray-400">/{result.type === 'PHQ9' ? 27 : 21}</span></div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${SEVERITY_COLORS[result.severity]}`}>
              {SEVERITY_LABELS[result.severity]}
            </span>
          </div>
          <p className="text-sm text-gray-500">Este resultado ha sido guardado. Tu doctora podra revisarlo en tu expediente.</p>
          <button onClick={() => setResult(null)} className="mt-3 text-sm text-salmon-600 hover:text-salmon-700 font-medium">
            Cerrar resultado
          </button>
        </div>
      )}

      {!activeType && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="card border border-gray-100 hover:border-salmon-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">PHQ-9</h3>
                <p className="text-sm text-gray-500">Depresion</p>
              </div>
              <span className="text-xs bg-salmon-50 text-salmon-700 px-2 py-1 rounded-full">9 preguntas</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Cuestionario sobre la salud del paciente para evaluar sintomas de depresion.</p>
            <button onClick={() => startQuestionnaire('PHQ9')} className="btn-primary text-sm w-full">
              Iniciar PHQ-9
            </button>
          </div>
          <div className="card border border-gray-100 hover:border-salmon-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">GAD-7</h3>
                <p className="text-sm text-gray-500">Ansiedad</p>
              </div>
              <span className="text-xs bg-salmon-50 text-salmon-700 px-2 py-1 rounded-full">7 preguntas</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Escala de trastorno de ansiedad generalizada para evaluar sintomas de ansiedad.</p>
            <button onClick={() => startQuestionnaire('GAD7')} className="btn-primary text-sm w-full">
              Iniciar GAD-7
            </button>
          </div>
        </div>
      )}

      {activeType && (
        <div className="card mb-6 border border-salmon-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">
              {activeType === 'PHQ9' ? 'PHQ-9 (Depresion)' : 'GAD-7 (Ansiedad)'}
            </h2>
            <button onClick={cancelQuestionnaire} className="text-sm text-gray-400 hover:text-gray-600">
              Cancelar
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
            En las ultimas 2 semanas, con que frecuencia le han molestado los siguientes problemas?
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, qi) => (
              <div key={qi} className="border-b border-gray-100 pb-5 last:border-0">
                <p className="text-sm font-medium text-gray-800 mb-3">{qi + 1}. {question}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ANSWER_OPTIONS.map((option, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                        answers[qi] === oi
                          ? 'border-salmon-400 bg-salmon-50 text-salmon-800'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        value={oi}
                        checked={answers[qi] === oi}
                        onChange={() => {
                          const next = [...answers];
                          next[qi] = oi;
                          setAnswers(next);
                        }}
                        className="accent-salmon-400"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {answers.every(a => a !== null) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Puntuacion preliminar:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{(answers as number[]).reduce((s, a) => s + a, 0)}</span>
                    <span className="text-gray-400">/ {maxScore}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[calculateSeverity(activeType, (answers as number[]).reduce((s, a) => s + a, 0))]}`}>
                      {SEVERITY_LABELS[calculateSeverity(activeType, (answers as number[]).reduce((s, a) => s + a, 0))]}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Enviando...' : 'Enviar Cuestionario'}
              </button>
              <button type="button" onClick={cancelQuestionnaire} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Historial de Cuestionarios</h3>
        {loading ? (
          <div className="card text-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-salmon-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium">Sin cuestionarios completados</p>
            <p className="text-sm">Completa tu primer cuestionario para ver tu historial</p>
          </div>
        ) : (
          history.map(q => (
            <div key={q.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{q.type === 'PHQ9' ? 'PHQ-9' : 'GAD-7'}</span>
                  <span className="text-xs text-gray-400">
                    {q.type === 'PHQ9' ? 'Depresion' : 'Ansiedad'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(q.date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">{q.score}<span className="text-sm text-gray-400">/{q.type === 'PHQ9' ? 27 : 21}</span></span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[q.severity]}`}>
                  {SEVERITY_LABELS[q.severity]}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
