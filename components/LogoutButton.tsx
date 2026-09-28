'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutButtonProps {
  variant?: 'boton' | 'sidebar';
  fullWidth?: boolean;
}

export default function LogoutButton({ variant = 'boton', fullWidth = false }: LogoutButtonProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleLogout() {
    setCargando(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const texto = cargando ? 'Saliendo…' : 'Cerrar sesión';

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={cargando}
        className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-[14.5px] font-semibold text-[#666c73] transition-colors hover:bg-[#f3f4f6] hover:text-[#b3372f] cursor-pointer disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#1f2328]"
      >
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
          <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
          <path d="M16 8l4 4-4 4M20 12H9" />
        </svg>
        {texto}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={cargando}
      className={`px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-pointer disabled:opacity-70 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {texto}
    </button>
  );
}