'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointments as appointmentsApi, payments as paymentsApi } from '@/lib/api';
import { Appointment, Payment } from '@/types';

export default function PagosPage() {
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [payingFor, setPayingFor] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadData = useCallback(async () => {
    try {
      const [appts, pays] = await Promise.all([appointmentsApi.list(), paymentsApi.list()]);
      setPendingAppointments(appts.filter((a: Appointment) => a.paymentStatus === 'pending' && a.status !== 'cancelled'));
      setPaymentHistory(pays);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingFor) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await paymentsApi.create({
        appointmentId: payingFor.id,
        method: paymentMethod,
        cardNumber: cardData.number,
        cardName: cardData.name,
      });
      setMessage({ type: 'success', text: '¡Pago procesado exitosamente! Tu cita ha sido confirmada.' });
      setPayingFor(null);
      setCardData({ number: '', name: '', expiry: '', cvv: '' });
      loadData();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al procesar pago' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-500 text-sm mt-1">Realiza pagos de consultas y revisa tu historial</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {payingFor ? (
        <div className="card max-w-lg mx-auto">
          <button onClick={() => setPayingFor(null)} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>

          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <p className="font-semibold text-primary-900">Pago de Consulta</p>
            <p className="text-sm text-primary-700">{payingFor.doctorName} - {payingFor.date} a las {payingFor.startTime}</p>
            <p className="text-2xl font-bold text-primary-800 mt-2">${payingFor.amount.toLocaleString()} MXN</p>
          </div>

          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="label-field">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'card', label: 'Tarjeta', icon: '💳' },
                  { value: 'transfer', label: 'Transferencia', icon: '🏦' },
                  { value: 'cash', label: 'Efectivo', icon: '💵' },
                ].map(m => (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all ${paymentMethod === m.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <span className="text-lg block">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'card' && (
              <>
                <div>
                  <label className="label-field">Número de tarjeta</label>
                  <input type="text" className="input-field" placeholder="1234 5678 9012 3456" maxLength={19}
                    value={cardData.number} onChange={e => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() })} required />
                </div>
                <div>
                  <label className="label-field">Nombre en la tarjeta</label>
                  <input type="text" className="input-field" placeholder="JUAN PEREZ" value={cardData.name} onChange={e => setCardData({ ...cardData, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">Fecha de expiración</label>
                    <input type="text" className="input-field" placeholder="MM/AA" maxLength={5}
                      value={cardData.expiry} onChange={e => setCardData({ ...cardData, expiry: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label-field">CVV</label>
                    <input type="password" className="input-field" placeholder="•••" maxLength={4}
                      value={cardData.cvv} onChange={e => setCardData({ ...cardData, cvv: e.target.value })} required />
                  </div>
                </div>
              </>
            )}

            {paymentMethod === 'transfer' && (
              <div className="bg-blue-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">Datos para transferencia:</p>
                <p className="text-blue-800">Banco: BBVA</p>
                <p className="text-blue-800">CLABE: 012180001234567890</p>
                <p className="text-blue-800">Beneficiario: PsiquiatrIApp S.A. de C.V.</p>
                <p className="text-blue-600 mt-2 text-xs">Envía el comprobante por WhatsApp al +52 55 1234 5678</p>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="bg-yellow-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-yellow-900 mb-1">Pago en efectivo</p>
                <p className="text-yellow-800">Realiza el pago directamente en el consultorio antes de la consulta.</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Procesando...' : `Pagar $${payingFor.amount.toLocaleString()} MXN`}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Pending payments */}
          {pendingAppointments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pagos Pendientes</h2>
              <div className="space-y-3">
                {pendingAppointments.map(apt => (
                  <div key={apt.id} className="card flex items-center justify-between border-l-4 border-l-orange-400">
                    <div>
                      <p className="font-medium text-gray-900">{apt.doctorName}</p>
                      <p className="text-sm text-gray-500">{apt.date} a las {apt.startTime} hrs</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-gray-900">${apt.amount.toLocaleString()}</p>
                      <button onClick={() => setPayingFor(apt)} className="btn-primary text-sm py-2">Pagar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Historial de Pagos</h2>
            {paymentHistory.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-400">No hay pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentHistory.map(pay => (
                  <div key={pay.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">${pay.amount.toLocaleString()} MXN</p>
                      <p className="text-sm text-gray-500">{new Date(pay.date).toLocaleDateString('es-MX')} - Ref: {pay.reference}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${pay.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {pay.status === 'completed' ? 'Completado' : 'Fallido'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
