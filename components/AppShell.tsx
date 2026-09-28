'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

/*
 * Shell reutilizable (alumno y docente): sidebar persistente en escritorio,
 * barra superior + menú lateral */

export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  exact?: boolean;
}

export interface NavGroup {
  titulo: string;
  items: NavItem[];
}

interface AppShellProps {
  grupos: NavGroup[];
  usuario: { nombre: string; detalle: string };
  titulo: string;
  footer: ReactNode;
  children: ReactNode;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return partes
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function ContenidoSidebar({
  grupos,
  usuario,
  footer,
}: Pick<AppShellProps, 'grupos' | 'usuario' | 'footer'>) {
  const pathname = usePathname();

  function esActivo(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  return (
    <div className="flex h-full flex-col">
      {/* Usuario */}
      <div className="flex items-center gap-3 border-b border-gray-200 p-4 pr-14 lg:pr-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1f2328] text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {iniciales(usuario.nombre)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{usuario.nombre}</p>
          <p className="truncate text-xs text-gray-500">{usuario.detalle}</p>
        </div>
      </div>

      {/* Módulos */}
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Módulos">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-5">
            <p className="mb-1 px-3 text-xs font-semibold text-gray-500">{grupo.titulo}</p>
            <ul className="space-y-1">
              {grupo.items.map((item) => {
                const activo = esActivo(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={activo ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2328]/40 ${
                        activo
                          ? 'bg-[#1f2328] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Pie: cerrar sesión */}
      <div className="border-t border-gray-200 p-4">{footer}</div>
    </div>
  );
}

export default function AppShell({ grupos, usuario, titulo, footer, children }: AppShellProps) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Cierra el menú móvil al navegar.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  // Con el menú abierto: Escape lo cierra y se bloquea el scroll de fondo.
  useEffect(() => {
    if (!abierto) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('keydown', onKeyDown);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto]);

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Sidebar de escritorio */}
      <aside className="hidden border-r border-gray-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0">
        <ContenidoSidebar grupos={grupos} usuario={usuario} footer={footer} />
      </aside>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2328]/40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <span className="truncate text-sm font-semibold text-gray-900">{titulo}</span>
      </header>

      {/* Menú móvil */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/40 cursor-pointer"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute right-2 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2328]/40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ContenidoSidebar grupos={grupos} usuario={usuario} footer={footer} />
          </div>
        </div>
      )}

      {/* Contenido */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}