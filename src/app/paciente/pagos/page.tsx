'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { appointments as appointmentsApi, payments as paymentsApi, stripeApi } from '@/lib/api';
import { Appointment, Payment } from '@/types';
import { useSearchParams } from 'next/navigation';

export default function PagosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-salmon-400 border-t-transparent rounded-full"></div></div>}>
      <PagosContent />
    </Suspense>
  );
}

function PagosContent() {
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [payingFor, setPayingFor] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe');
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const searchParams = useSearchParams();

  const loadData = useCallback(async () => {
    try {
      const [appts, pays] = await Promise.all([appointmentsApi.list(), paymentsApi.list()]);
      setPendingAppointments(appts.filter((a: Appointment) => a.paymentStatus === 'pending' && a.status !== 'cancelled'));
      setPaymentHistory(pays);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Stripe redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');
    const appointmentId = searchParams.get('appointment_id');

    if (success === 'true' && sessionId && appointmentId) {
      // Verify the payment with our backend
      stripeApi.verifyPayment(sessionId, appointmentId).then(() => {
        setMessage({ type: 'success', text: '¡Pago con Stripe procesado exitosamente! Tu cita ha sido confirmada.' });
        loadData();
      }).catch(() => {
        setMessage({ type: 'success', text: '¡Pago procesado! Tu cita será confirmada en breve.' });
        loadData();
      });
      // Clean URL
      window.history.replaceState({}, '', '/paciente/pagos');
    } else if (searchParams.get('cancelled') === 'true') {
      setMessage({ type: 'error', text: 'Pago cancelado. Puedes intentar de nuevo.' });
      window.history.replaceState({}, '', '/paciente/pagos');
    }
  }, [searchParams, loadData]);

  const handleStripePayment = async (appointment: Appointment) => {
    setLoading(true);
    try {
      const { url } = await stripeApi.createCheckout(appointment.id);
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al iniciar pago con Stripe' });
      setLoading(false);
    }
  };

  const handleManualPayment = async (e: React.FormEvent) => {
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
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-primary-50 text-primary-700 border border-primary-200'}`}>
          {message.text}
        </div>
      )}

      {payingFor ? (
        <div className="card max-w-lg mx-auto">
          <button onClick={() => setPayingFor(null)} className="flex items-center gap-2 text-salmon-500 hover:text-salmon-600 mb-4 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>

          <div className="bg-salmon-50 rounded-lg p-4 mb-6 border border-salmon-100">
            <p className="font-semibold text-gray-900">Pago de Consulta</p>
            <p className="text-sm text-gray-600">{payingFor.doctorName} - {payingFor.date} a las {payingFor.startTime}</p>
            <p className="text-2xl font-bold text-salmon-600 mt-2">${payingFor.amount.toLocaleString()} MXN</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label-field">Método de pago</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button type="button" onClick={() => setPaymentMethod('stripe')}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${paymentMethod === 'stripe' ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" /></svg>
                  Stripe
                </button>
                <button type="button" onClick={() => setPaymentMethod('transfer')}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all ${paymentMethod === 'transfer' ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  🏦 Transferencia
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentMethod('card')}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all ${paymentMethod === 'card' ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  💳 Tarjeta Manual
                </button>
                <button type="button" onClick={() => setPaymentMethod('cash')}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all ${paymentMethod === 'cash' ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  💵 Efectivo
                </button>
              </div>
            </div>

            {paymentMethod === 'stripe' && (
              <div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-salmon-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    <span className="font-medium text-gray-900">Pago seguro con Stripe</span>
                  </div>
                  <p>Serás redirigido a la página de pago seguro de Stripe donde podrás pagar con tarjeta de crédito, débito o métodos locales.</p>
                </div>
                <button onClick={() => handleStripePayment(payingFor)} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? 'Redirigiendo a Stripe...' : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" /></svg>
                      Pagar ${payingFor.amount.toLocaleString()} MXN con Stripe
                    </>
                  )}
                </button>
              </div>
            )}

            {paymentMethod === 'card' && (
              <form onSubmit={handleManualPayment} className="space-y-4">
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
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Procesando...' : `Pagar $${payingFor.amount.toLocaleString()} MXN`}
                </button>
              </form>
            )}

            {paymentMethod === 'transfer' && (
              <div>
                <div className="bg-salmon-50 rounded-lg p-4 text-sm border border-salmon-100">
                  <p className="font-medium text-gray-900 mb-2">Datos para transferencia:</p>
                  <p className="text-gray-700">Banco: BBVA</p>
                  <p className="text-gray-700">CLABE: 012180001234567890</p>
                  <p className="text-gray-700">Beneficiario: PsiquiatrIApp S.A. de C.V.</p>
                  <p className="text-gray-500 mt-2 text-xs">Envía el comprobante por WhatsApp al +52 55 1234 5678</p>
                </div>
                <form onSubmit={handleManualPayment}>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                    {loading ? 'Procesando...' : 'Confirmar Transferencia'}
                  </button>
                </form>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-200">
                  <p className="font-medium text-gray-900 mb-1">Pago en efectivo</p>
                  <p className="text-gray-600">Realiza el pago directamente en el consultorio antes de la consulta.</p>
                </div>
                <form onSubmit={handleManualPayment}>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                    {loading ? 'Procesando...' : 'Registrar Pago en Efectivo'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Pending payments */}
          {pendingAppointments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pagos Pendientes</h2>
              <div className="space-y-3">
                {pendingAppointments.map(apt => (
                  <div key={apt.id} className="card flex items-center justify-between border-l-4 border-l-salmon-400">
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
                      <p className="text-sm text-gray-500">
                        {new Date(pay.date).toLocaleDateString('es-MX')} - Ref: {pay.reference}
                        {pay.reference?.startsWith('STRIPE-') && <span className="ml-1 text-salmon-500 text-xs font-medium">Stripe</span>}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${pay.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-primary-100 text-primary-800'}`}>
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
