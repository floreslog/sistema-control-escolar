'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

const NAV_ITEMS = [
  { href: '/docente', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/docente/grupos', label: 'Grupos', icon: Users },
  { href: '/docente/materias', label: 'Materias', icon: BookOpen },
  { href: '/docente/alumnos', label: 'Alumnos', icon: GraduationCap },
  { href: '/docente/calificaciones', label: 'Calificaciones', icon: ClipboardCheck },
  { href: '/docente/extraordinarios', label: 'Extraordinarios', icon: RefreshCw },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col p-4">
      <div className="flex items-center gap-2 px-2 pb-6">
        <LayoutDashboard size={18} className="text-gray-900" />
        <span className="text-sm font-semibold text-gray-900">Control escolar</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-2 border-t border-gray-100">
        <LogoutButton />
      </div>
    </aside>
  );
}