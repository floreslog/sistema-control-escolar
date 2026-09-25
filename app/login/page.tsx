'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Rol = 'docente' | 'alumno';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rol, setRol] = useState<Rol>('docente');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const label = rol === 'docente' ? 'Número de empleado' : 'Matrícula';
  const placeholder = rol === 'docente' ? 'Ej. EMP-1024' : 'Ej. A21001234';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, identificador, password, remember }),
      });

      const data = await res.json();

      if (res.status === 428) {
        router.push(`/crear-password?matricula=${encodeURIComponent(identificador)}`);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error al iniciar sesión.');
        return;
      }

      const redirect = searchParams.get('redirect');
      router.push(redirect ?? (data.rol === 'docente' ? '/docente' : '/alumno'));
      router.refresh();
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    // Ocupa toda la pantalla, sin márgenes ni centrado de "tarjeta de demo"
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#1f2328]">

      {/* Panel de marca */}
      <section className="relative text-white flex flex-col items-center justify-center text-center px-12 py-10 overflow-hidden order-1">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="rules" width="40" height="38" patternUnits="userSpaceOnUse">
              <path d="M0 37.5H40" stroke="#fff" strokeOpacity=".06" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rules)" />
          <line x1="72" y1="0" x2="72" y2="100%" stroke="#fff" strokeOpacity=".12" className="hidden md:block" />
        </svg>

        <div className="relative z-10 flex flex-col items-center gap-5">
          <svg viewBox="0 0 96 96" className="w-16 h-16 md:w-24 md:h-24" role="img" aria-label="Escudo de Control Escolar">
            <circle cx="48" cy="48" r="47" fill="#fff" />
            <circle cx="48" cy="48" r="42" fill="none" stroke="#1f2328" strokeWidth="1.5" />
            <path d="M48 36 C41 31 32 30 25 32 V61 C32 59 41 60 48 65 Z" fill="none" stroke="#1f2328" strokeWidth="3" strokeLinejoin="round" />
            <path d="M48 36 C55 31 64 30 71 32 V61 C64 59 55 60 48 65 Z" fill="none" stroke="#1f2328" strokeWidth="3" strokeLinejoin="round" />
            <path d="M48 69 V73" stroke="#1f2328" strokeWidth="3" strokeLinecap="round" />
            <circle cx="48" cy="22" r="2.5" fill="#1f2328" />
          </svg>
          <div>
            <div className="text-xl md:text-2xl font-bold tracking-tight">Control Escolar</div>
            <div className="text-sm text-white/70 mt-2">Sistema de control académico</div>
          </div>
        </div>
      </section>

      {/* Panel del formulario */}
      <section className="bg-white md:-ml-7 rounded-t-3xl md:rounded-l-[28px] md:rounded-tr-none px-6 py-10 md:px-16 md:py-14 flex flex-col justify-center order-2">
        <div className="w-full max-w-[380px] mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Iniciar sesión</h1>
          <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
            Selecciona tu rol e ingresa tus datos para acceder al sistema.
          </p>

          {/* Toggle de rol */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setRol('docente')}
              className={`h-10 rounded-md text-sm font-semibold transition cursor-pointer ${
                rol === 'docente' ? 'bg-white shadow text-[#1f2328]' : 'text-gray-500'
              }`}
            >
              Docente
            </button>
            <button
              type="button"
              onClick={() => setRol('alumno')}
              className={`h-10 rounded-md text-sm font-semibold transition cursor-pointer ${
                rol === 'alumno' ? 'bg-white shadow text-[#1f2328]' : 'text-gray-500'
              }`}
            >
              Alumno
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="identificador" className="block text-[13.5px] font-semibold mb-2">
                {label}
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 8 8 6 8-6" />
                </svg>
                <input
                  id="identificador"
                  type="text"
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-[50px] pl-11 pr-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
                />
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="block text-[13.5px] font-semibold mb-2">
                Contraseña
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="10.5" width="16" height="10" rx="3" />
                  <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                </svg>
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="w-full h-[50px] pl-11 pr-12 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[38px] h-[38px] grid place-items-center text-gray-500 hover:text-[#1f2328] hover:bg-gray-100 rounded-lg cursor-pointer"
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? (
                    <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 6a10 10 0 0 1 1.4-.1c6.4 0 10 6.1 10 6.1a17 17 0 0 1-3.1 3.8M6.5 7.6A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.3-1" />
                      <path d="M9.9 10a2.8 2.8 0 0 0 4 4" />
                    </svg>
                  ) : (
                    <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 text-[13.5px]">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-5 h-5 flex-none grid place-items-center border-[1.5px] border-gray-300 rounded peer-checked:bg-[#1f2328] peer-checked:border-[#1f2328] peer-focus-visible:ring-4 peer-focus-visible:ring-gray-200 transition">
                  <svg className={`w-3 h-3 stroke-white ${remember ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 12 12" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m2.5 6.5 2.5 2.5 4.5-5.5" />
                  </svg>
                </span>
                Recordarme
              </label>
              <a href="/recuperar" className="font-semibold text-[#1f2328] hover:underline underline-offset-4">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-[52px] font-bold text-white bg-[#1f2328] rounded-lg hover:bg-[#3a4048] active:scale-[.985] transition disabled:opacity-70 disabled:cursor-progress cursor-pointer"
            >
              {cargando ? 'Entrando…' : 'Ingresar'}
            </button>
          </form>

          {rol === 'alumno' && (
            <p className="mt-7 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
              ¿Primera vez aquí?{' '}
              <a href="/crear-password" className="font-semibold text-[#1f2328] hover:underline underline-offset-4">
                Crea tu contraseña
              </a>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}