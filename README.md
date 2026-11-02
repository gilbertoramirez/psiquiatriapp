# PsiquiatrIApp

Sistema integral para la gestión de pacientes de psiquiatría.

## Características

### Portal del Paciente
- Registro, inicio de sesión (email o Google) y aceptación de invitaciones del doctor
- Calendario para agendar citas en horarios válidos, presenciales o virtuales (enlace de Meet)
- Cancelación y reprogramación de citas
- Pagos con Stripe (tarjeta), transferencia o efectivo
- Recetas médicas y recomendaciones con pasos completables
- Consulta de su propio expediente (historia clínica y notas, solo lectura)
- Seguimiento diario (check-ins de estado de ánimo)
- Cuestionarios clínicos
- Notificaciones dentro de la app y blog

### Portal del Doctor
- Dashboard con estadísticas
- Calendario de citas (vista mensual y semanal)
- Gestión de pacientes: invitaciones (con cuenta) y registro de pacientes sin cuenta digital
- Historia clínica conforme a NOM-004-SSA3-2012 §6.1
- Notas de evolución (NOM-004 §6.2) con diagnósticos CIE-10, signos vitales, riesgo, firma SHA-256 y addendums (NOM-024); formato SOAP opcional
- Agendar la cita de seguimiento desde la nota, con horarios disponibles
- Expediente en PDF
- Recetas (con firma digital, exportación a PDF y generación automática desde las notas) y recomendaciones
- Blog

### Automatizaciones
- Recordatorios diarios de citas por SMS / WhatsApp (Twilio), ejecutados por Vercel Cron en `/api/cron/reminders`

### Tecnologías
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (con modo oscuro)
- PostgreSQL con Prisma (adaptador Neon en producción)
- Stripe, Twilio, Google OAuth / Calendar
- PWA para soporte móvil

## Inicio rápido

```bash
cp .env.example .env   # completa las variables
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abre http://localhost:3000

### Variables de entorno
Consulta `.env.example`. Las mínimas para arrancar son `DATABASE_URL` y `JWT_SECRET`; Stripe, Google y Twilio son necesarias solo para sus funciones respectivas.

### Credenciales de prueba (Doctor)
- Email: dra.hernandez@psiquiatriapp.com
- Password: doctor123

### Registro de pacientes
Los pacientes pueden registrarse desde la página principal o mediante una invitación del doctor.

## Despliegue
Pensado para Vercel + Neon. El cron de recordatorios está definido en `vercel.json`.
