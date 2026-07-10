const API_BASE = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

// Auth
export const auth = {
  login: (data: { email: string; password: string }) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getUser: () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },
};

// Appointments
export const appointments = {
  list: () => fetchAPI('/appointments'),
  create: (data: Record<string, string>) => fetchAPI('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  confirmPayment: (appointmentId: string, method: string) =>
    fetchAPI('/appointments/confirm-payment', { method: 'POST', body: JSON.stringify({ appointmentId, method }) }),
  cancel: (appointmentId: string, reason: string) =>
    fetchAPI('/appointments/cancel', { method: 'POST', body: JSON.stringify({ appointmentId, reason }) }),
};

// Prescriptions
export const prescriptions = {
  list: () => fetchAPI('/prescriptions'),
  create: (data: Record<string, unknown>) => fetchAPI('/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
};

// Recommendations
export const recommendations = {
  list: () => fetchAPI('/recommendations'),
  create: (data: Record<string, unknown>) => fetchAPI('/recommendations', { method: 'POST', body: JSON.stringify(data) }),
};

// Payments
export const payments = {
  list: () => fetchAPI('/payments'),
  create: (data: Record<string, unknown>) => fetchAPI('/payments', { method: 'POST', body: JSON.stringify(data) }),
};

// Stripe
export const stripeApi = {
  createCheckout: (appointmentId: string) => fetchAPI('/stripe/checkout', { method: 'POST', body: JSON.stringify({ appointmentId }) }),
  verifyPayment: (sessionId: string, appointmentId: string) => fetchAPI('/stripe/verify', { method: 'POST', body: JSON.stringify({ sessionId, appointmentId }) }),
};

// Blog
export const blog = {
  list: () => fetchAPI('/blog'),
  get: (id: string) => fetchAPI(`/blog?id=${id}`),
  create: (data: Record<string, unknown>) => fetchAPI('/blog', { method: 'POST', body: JSON.stringify(data) }),
  comment: (postId: string, content: string) => fetchAPI('/blog', { method: 'PATCH', body: JSON.stringify({ postId, content }) }),
};

// Invitations (doctor)
export const invitations = {
  create: (data: { name: string; email: string; phone?: string }) =>
    fetchAPI('/invitations', { method: 'POST', body: JSON.stringify(data) }),
  list: () => fetchAPI('/invitations'),
  verify: (token: string) => fetchAPI(`/invitations/accept?token=${token}`),
  accept: (data: { token: string; password: string }) =>
    fetchAPI('/invitations/accept', { method: 'POST', body: JSON.stringify(data) }),
};

// Check-ins (patient)
export const checkIns = {
  list: () => fetchAPI('/checkins'),
  listByPatient: (patientId: string) => fetchAPI(`/checkins?patientId=${patientId}`),
  create: (data: Record<string, unknown>) => fetchAPI('/checkins', { method: 'POST', body: JSON.stringify(data) }),
};

// Notifications
export const notifications = {
  list: () => fetchAPI('/notifications'),
  markRead: (id: string) => fetchAPI(`/notifications`, { method: 'PATCH', body: JSON.stringify({ id }) }),
  markAllRead: () => fetchAPI('/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) }),
};

// Questionnaires
export const questionnaires = {
  list: () => fetchAPI('/questionnaires'),
  listByPatient: (patientId: string) => fetchAPI(`/questionnaires?patientId=${patientId}`),
  create: (data: Record<string, unknown>) => fetchAPI('/questionnaires', { method: 'POST', body: JSON.stringify(data) }),
};

// Expediente PDF
export const expediente = {
  getUrl: (patientId: string) => `/api/expediente?patientId=${patientId}`,
};

// Doctor profile
export const doctorProfile = {
  updateSignature: (signatureData: string) =>
    fetchAPI('/doctors/signature', { method: 'POST', body: JSON.stringify({ signatureData }) }),
};

// Patients (doctor)
export const patients = {
  stats: () => fetchAPI('/patients'),
  list: () => fetchAPI('/patients?type=list'),
  logs: (patientId: string) => fetchAPI(`/patients?type=logs&patientId=${patientId}`),
  createLog: (data: Record<string, unknown>) => fetchAPI('/patients', { method: 'POST', body: JSON.stringify(data) }),
};
