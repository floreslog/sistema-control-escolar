'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleLogout() {
    setCargando(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={cargando}
      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-pointer disabled:opacity-70"
    >
      {cargando ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  );
}