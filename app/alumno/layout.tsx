import type { ReactNode } from 'react';
import AppShell, { type NavGroup } from '@/components/AppShell';
import LogoutButton from '@/components/LogoutButton';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getPerfil } from '@/lib/alumno/queries';

const iconoClase = 'h-5 w-5 shrink-0';

const GRUPOS: NavGroup[] = [
  {
    titulo: 'Ciclo',
    items: [
      {
        label: 'Actual',
        href: '/alumno',
        exact: true,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconoClase} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        ),
      },
    ],
  },
  {
    titulo: 'Resumen',
    items: [
      {
        label: 'General',
        href: '/alumno/general',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconoClase} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        ),
      },
    ],
  },
  {
    titulo: 'Consulta',
    items: [
      {
        label: 'Historial',
        href: '/alumno/historial',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconoClase} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
];

export default async function AlumnoLayout({ children }: { children: ReactNode }) {
  
  const session = await requireAlumno();
  const perfil = await getPerfil();


  if (!perfil) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Cuenta no disponible</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tu cuenta, {session.nombre}, está inactiva o ya no existe. Consulta con tu docente
            o con control escolar.
          </p>
          <div className="mt-5">
            <LogoutButton fullWidth />
          </div>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      grupos={GRUPOS}
      usuario={{ nombre: perfil.nombreCompleto, detalle: `Matrícula ${perfil.matricula}` }}
      titulo="Panel del alumno"
      footer={<LogoutButton fullWidth />}
    >
      {children}
    </AppShell>
  );
}