import type { ReactNode } from 'react';
import { Manrope } from 'next/font/google';
import AppShell, { type NavGroup } from '@/components/AppShell';
import LogoutButton from '@/components/LogoutButton';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getPerfil } from '@/lib/docente/queries';

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
        label: 'Inicio',
        href: '/docente',
        exact: true,
        icon: (
          <Icono>
            <path d="M4 11.5 12 5l8 6.5" />
            <path d="M6 10.5V19h12v-8.5" />
          </Icono>
        ),
      },
    ],
  },
  {
    titulo: 'Académico',
    items: [
      {
        label: 'Mis grupos',
        href: '/docente/grupos',
        icon: (
          <Icono>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
            <path d="M16 5.5a3 3 0 0 1 0 5.5M17.5 14.5c2 .5 3 2.2 3 4.5" />
          </Icono>
        ),
      },
      {
        label: 'Calificaciones',
        href: '/docente/calificaciones',
        icon: (
          <Icono>
            <rect x="5" y="4" width="14" height="16" rx="2" />
            <path d="m9 12 2 2 4-4" />
          </Icono>
        ),
      },
      {
        label: 'Extraordinarios',
        href: '/docente/extraordinarios',
        icon: (
          <Icono>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M4 10h16M9 3v4M15 3v4" />
          </Icono>
        ),
      },
    ],
  },
  {
    titulo: 'Alumnos',
    items: [
      {
        label: 'Alumnos',
        href: '/docente/alumnos',
        icon: (
          <Icono>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
          </Icono>
        ),
      },
    ],
  },
];

export default async function DocenteLayout({ children }: { children: ReactNode }) {
  // Segunda barrera además del middleware. Cada página vuelve a llamarla:
  // los layouts no se re-ejecutan al navegar entre páginas hijas.
  const session = await requireDocente();
  const perfil = await getPerfil();

  // Sesión válida pero docente inexistente o dado de baja. NO se redirige a
  // /login: el middleware regresaría al usuario a /docente y habría un ciclo.
  if (!perfil) {
    return (
      <div className={`${manrope.className} antialiased`}>
        <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-6">
          <div className="w-full max-w-md rounded-xl border border-[#dcdfe3] bg-white p-6 text-center">
            <h1 className="text-lg font-bold text-[#1a1d21]">Cuenta no disponible</h1>
            <p className="mt-2 text-sm text-[#666c73]">
              Tu cuenta, {session.nombre}, está inactiva o ya no existe. Consulta con control
              escolar.
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
        usuario={{ nombre: perfil.nombreCompleto, detalle: perfil.numeroEmpleado }}
        titulo="Control escolar"
        footer={<LogoutButton variant="sidebar" />}
      >
        {children}
      </AppShell>
    </div>
  );
}