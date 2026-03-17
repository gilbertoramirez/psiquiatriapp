import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'psiquiatriapp-secret-key-change-in-production';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): { id: string; email: string; role: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; name: string };
  } catch {
    return null;
  }
}

// Password storage (in production use a real DB)
// Uses globalThis to persist across Next.js hot reloads
const globalForAuth = globalThis as unknown as { __psiquiatriapp_passwords?: Map<string, string> };

if (!globalForAuth.__psiquiatriapp_passwords) {
  globalForAuth.__psiquiatriapp_passwords = new Map();
  // Pre-set doctor password
  (async () => {
    const hash = await hashPassword('doctor123');
    globalForAuth.__psiquiatriapp_passwords!.set('doc-1', hash);
  })();
}

const passwords = globalForAuth.__psiquiatriapp_passwords;

export function getPasswordStore() {
  return passwords;
}
