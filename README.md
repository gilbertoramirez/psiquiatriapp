# PsiquiatrIApp

Sistema integral para la gestión de pacientes de psiquiatría.

## Características

### Portal del Paciente
- Registro, inicio de sesión (email o Google) y aceptación de invitaciones del doctor
- Calendario para agendar citas en horarios válidos, presenciales o virtuales (enlace de Meet)
- Cancelación y reprogramación de citas
- Pagos con Stripe (tarjeta), transferencia o efectivo
- Recetas médicas y recomendaciones con pasos completables
- Seguimiento diario (check-ins de estado de ánimo)
- Cuestionarios clínicos
- Notificaciones dentro de la app y blog

### Portal del Doctor
- Dashboard con estadísticas
- Calendario de citas (vista mensual y semanal)
- Gestión de pacientes e invitaciones
- Expediente clínico y bitácora con notas SOAP
- Recetas (con firma digital y exportación a PDF) y recomendaciones
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
