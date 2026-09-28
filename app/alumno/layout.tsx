import type { ReactNode } from 'react';
import { Manrope } from 'next/font/google';
import AppShell, { type NavGroup } from '@/components/AppShell';
import LogoutButton from '@/components/LogoutButton';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getPerfil } from '@/lib/alumno/queries';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[19px] w-[19px] shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const GRUPOS: NavGroup[] = [
  {
    items: [
      {
        label: 'Actual',
        href: '/alumno',
        exact: true,
        icon: (
          <Icono>
            <path d="M4 5c3-1 6-1 8 1v13c-2-2-5-2-8-1z" />
            <path d="M20 5c-3-1-6-1-8 1v13c2-2 5-2 8-1z" />
          </Icono>
        ),
      },
      {
        label: 'General',
        href: '/alumno/general',
        icon: (
          <Icono>
            <path d="m12 4 9 5-9 5-9-5z" />
            <path d="m3 14 9 5 9-5" />
          </Icono>
        ),
      },
      {
        label: 'Historial',
        href: '/alumno/historial',
        icon: (
          <Icono>
            <rect x="4" y="4" width="7" height="7" rx="2" />
            <rect x="13" y="4" width="7" height="7" rx="2" />
            <rect x="4" y="13" width="7" height="7" rx="2" />
            <rect x="13" y="13" width="7" height="7" rx="2" />
          </Icono>
        ),
      },
    ],
  },
];

export default async function AlumnoLayout({ children }: { children: ReactNode }) {
  // Segunda barrera además del middleware. Cada página vuelve a llamarla:
  // los layouts no se re-ejecutan al navegar entre páginas hijas.
  const session = await requireAlumno();
  const perfil = await getPerfil();

  // Sesión válida pero alumno inexistente o dado de baja. NO se redirige a
  // /login: el middleware regresaría al usuario a /alumno y habría un ciclo.
  if (!perfil) {
    return (
      <div className={`${manrope.className} antialiased`}>
        <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-6">
          <div className="w-full max-w-md rounded-xl border border-[#dcdfe3] bg-white p-6 text-center">
            <h1 className="text-lg font-bold text-[#1a1d21]">Cuenta no disponible</h1>
            <p className="mt-2 text-sm text-[#666c73]">
              Tu cuenta, {session.nombre}, está inactiva o ya no existe. Consulta con tu docente
              o con control escolar.
            </p>
            <div className="mt-5">
              <LogoutButton fullWidth />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={manrope.className}>
      <AppShell
        grupos={GRUPOS}
        usuario={{ nombre: perfil.nombreCompleto, detalle: perfil.matricula }}
        titulo="Control escolar"
        footer={<LogoutButton variant="sidebar" />}
      >
        {children}
      </AppShell>
    </div>
  );
}