'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function Sidebar({ items, role }: { items: NavItem[]; role: 'patient' | 'doctor' }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around py-2">
          {items.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${active ? 'text-salmon-500' : 'text-gray-400 hover:text-gray-600'}`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:min-h-screen bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-salmon-400 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">PsiquiatrIApp</span>
              <p className="text-xs text-gray-500">{role === 'doctor' ? 'Portal Médico' : 'Portal Paciente'}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {items.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-salmon-50 text-salmon-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={() => auth.logout()} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 w-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
