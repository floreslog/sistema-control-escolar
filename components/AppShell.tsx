'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  exact?: boolean;
}

export interface NavGroup {
  titulo?: string;
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
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#1f2328]';

export default function AppShell({ grupos, usuario, titulo, footer, children }: AppShellProps) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  function esActivo(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

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
    <div className="min-h-screen bg-[#f3f4f6] text-[#1a1d21] antialiased">
      {/* Sidebar (en móvil se desliza desde la izquierda) */}
      <aside
        id="sidebar"
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col border-r border-[#dcdfe3] bg-white transition-[transform,visibility] duration-200 motion-reduce:transition-none ${
          abierto
            ? 'max-[860px]:translate-x-0 max-[860px]:shadow-[0_0_40px_rgba(20,22,26,0.2)]'
            : 'max-[860px]:invisible max-[860px]:-translate-x-full'
        }`}
      >
        {/* Perfil */}
        <div className="flex items-center gap-3 border-b border-[#dcdfe3] px-[22px] pb-[22px] pt-7">
          <div
            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-[#1f2328] text-[15px] font-bold tracking-[0.02em] text-white"
            aria-hidden="true"
          >
            {iniciales(usuario.nombre)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-[-0.01em]">{usuario.nombre}</p>
            <p className="mt-0.5 text-[12.5px] text-[#666c73]">{usuario.detalle}</p>
          </div>
        </div>

        {/* Módulos */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Módulos">
          {grupos.map((grupo, i) => (
            <div key={grupo.titulo ?? i} className="flex flex-col gap-1">
              {grupo.titulo && (
                <p className="mt-3 px-3 pb-1 text-xs font-semibold text-[#666c73]">{grupo.titulo}</p>
              )}
              {grupo.items.map((item) => {
                const activo = esActivo(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={activo ? 'page' : undefined}
                    className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[14.5px] font-semibold transition-colors ${FOCO} ${
                      activo
                        ? 'bg-[#e9eaec] text-[#1f2328]'
                        : 'text-[#666c73] hover:bg-[#f3f4f6] hover:text-[#1a1d21]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pie: cerrar sesión */}
        <div className="border-t border-[#dcdfe3] p-3">{footer}</div>
      </aside>

      {/* Fondo del menú móvil */}
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-20 cursor-pointer bg-[rgba(20,22,26,0.35)] min-[861px]:hidden"
        />
      )}

      {/* Contenido */}
      <main className="relative min-h-screen overflow-hidden px-5 pb-10 min-[861px]:ml-[264px] min-[861px]:px-12 min-[861px]:pb-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[120px] -top-[140px] h-[420px] w-[420px] rounded-full bg-[#d5dee8] blur-[80px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[200px] left-[10%] h-[380px] w-[380px] rounded-full bg-[#e6eaef] blur-[80px]"
        />

        {/* Barra superior: solo móvil, con el botón que abre el menú */}
        <div className="relative flex h-[76px] items-center gap-3 min-[861px]:hidden">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
            aria-controls="sidebar"
            className={`grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-[#dcdfe3] bg-white ${FOCO}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[19px] w-[19px]"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <span className="text-[15px] font-bold tracking-[-0.01em]">{titulo}</span>
        </div>

        <div className="relative max-w-[1040px]">{children}</div>
      </main>
    </div>
  );
}