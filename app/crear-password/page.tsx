'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { calcularFortaleza } from '@/lib/passwordStrength';

function CrearPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matricula, setMatricula] = useState(searchParams.get('matricula') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const fortaleza = calcularFortaleza(password);
  const coinciden = confirmPassword.length > 0 && password === confirmPassword;
  const noCoinciden = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch('/api/auth/crear-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error al crear tu contraseña.');
        return;
      }

      router.push('/alumno');
      router.refresh();
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white lg:grid lg:grid-cols-2 lg:bg-[linear-gradient(90deg,#fff_0%,#fff_40%,#f3f4f6_64%,#e4e8ec_100%)]">

      {/* ---------- Panel del formulario ---------- */}
      <section className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[380px] mx-auto">

          {/* Marca */}
          <header className="flex items-center gap-3.5">
            <svg viewBox="0 0 96 96" className="w-[52px] h-[52px] flex-none" role="img" aria-label="Escudo de Control Escolar">
              <circle cx="48" cy="48" r="47" fill="#1f2328" />
              <circle cx="48" cy="48" r="42" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
              <path d="M48 36 C41 31 32 30 25 32 V61 C32 59 41 60 48 65 Z" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M48 36 C55 31 64 30 71 32 V61 C64 59 55 60 48 65 Z" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M48 69 V73" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx="48" cy="22" r="2.5" fill="#fff" />
            </svg>
            <div>
              <div className="text-lg font-bold tracking-tight leading-tight">Control Escolar</div>
              <div className="text-[13px] text-gray-500 mt-0.5">Sistema de control académico</div>
            </div>
          </header>

          <div className="mt-7 pt-7 border-t border-gray-200">
            <h1 className="text-[28px] font-bold tracking-tight leading-tight">Crea tu contraseña</h1>
            <p className="text-[14.5px] text-gray-500 leading-relaxed mt-1.5">
              Es tu primer ingreso al sistema. Crea una contraseña para tu cuenta de alumno.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6">
            <div className="mb-5">
              <label htmlFor="matricula" className="block text-[13.5px] font-semibold mb-2">
                Matrícula
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 8 8 6 8-6" />
                </svg>
                <input
                  id="matricula"
                  type="text"
                  required
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ej. A21001234"
                  className="w-full h-[50px] pl-11 pr-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-[#e9eaec]"
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="block text-[13.5px] font-semibold mb-2">
                Nueva contraseña
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
                  placeholder="Mínimo 8 caracteres"
                  className="w-full h-[50px] pl-11 pr-12 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-[#e9eaec]"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[38px] h-[38px] grid place-items-center text-gray-500 hover:text-[#1f2328] hover:bg-[#e9eaec] rounded-lg cursor-pointer"
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

              {password.length > 0 && (
                <div className="mt-2.5">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${fortaleza.color}`}
                      style={{ width: `${fortaleza.porcentaje}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">{fortaleza.etiqueta}</p>
                </div>
              )}
            </div>

            <ul className="mb-5 text-xs text-gray-500 space-y-1 pl-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>• Mínimo 8 caracteres</li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>• Al menos una mayúscula</li>
              <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>• Al menos un número</li>
            </ul>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-[13.5px] font-semibold mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="10.5" width="16" height="10" rx="3" />
                  <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                </svg>
                <input
                  id="confirmPassword"
                  type={mostrarConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`w-full h-[50px] pl-11 pr-12 text-[15px] border-[1.5px] rounded-lg outline-none transition focus:ring-4 ${
                    noCoinciden
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-[#1f2328] focus:ring-[#e9eaec]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirm((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[38px] h-[38px] grid place-items-center text-gray-500 hover:text-[#1f2328] hover:bg-[#e9eaec] rounded-lg cursor-pointer"
                  aria-label={mostrarConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarConfirm ? (
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
              {noCoinciden && <p className="mt-1.5 text-xs text-red-600">Las contraseñas no coinciden.</p>}
              {coinciden && <p className="mt-1.5 text-xs text-green-600">Las contraseñas coinciden.</p>}
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando || !coinciden || password.length < 8}
              className="w-full h-[52px] font-bold text-white bg-[#1f2328] rounded-lg hover:bg-[#3a4048] active:scale-[.985] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {cargando ? 'Creando cuenta…' : 'Crear contraseña e ingresar'}
            </button>
          </form>

          <p className="mt-6 pt-[22px] border-t border-gray-200 text-center text-sm text-gray-500">
            ¿Ya tienes contraseña?{' '}
            <a href="/login" className="font-semibold text-[#1f2328] hover:underline underline-offset-4">
              Inicia sesión
            </a>
          </p>
        </div>
      </section>

      {/* ---------- Aside ilustrativo (oculto en móvil) ---------- */}
      <aside className="hidden lg:grid relative place-items-center p-12 overflow-hidden">
        <div className="absolute w-[360px] h-[360px] -left-[140px] top-[14%] rounded-full blur-[70px] bg-[#d5dee8]" aria-hidden="true" />
        <div className="absolute w-[420px] h-[420px] -right-[100px] -bottom-[120px] rounded-full blur-[70px] bg-[#e9edf2]" aria-hidden="true" />

        <div className="relative w-full max-w-[440px]">
          <h2 className="text-[30px] font-bold tracking-tight leading-tight">Ya casi entras</h2>
          <p className="text-[15px] text-gray-500 leading-relaxed mt-2.5 max-w-[340px]">
            Crea tu contraseña una sola vez y accede cuando quieras a tus calificaciones.
          </p>

          <div className="relative h-[220px] mt-10" aria-hidden="true">
            {/* Tarjeta de checklist de seguridad */}
            <div className="absolute left-0 top-0 w-[260px] bg-white border border-gray-200 rounded-[14px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_14px_30px_rgba(20,22,26,0.07)] px-[18px] py-4">
              <div className="text-[12.5px] font-semibold text-gray-500 mb-3">Tu contraseña</div>
              {['Mínimo 8 caracteres', 'Una mayúscula', 'Un número'].map((texto) => (
                <div key={texto} className="flex items-center gap-2.5 mb-2 text-[13px] font-medium text-gray-700">
                  <span className="w-4 h-4 flex-none grid place-items-center bg-[#1f2328] rounded-full">
                    <svg className="w-2.5 h-2.5 stroke-white" viewBox="0 0 12 12" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m2.5 6.5 2.5 2.5 4.5-5.5" />
                    </svg>
                  </span>
                  {texto}
                </div>
              ))}
            </div>

            {/* Tarjeta de candado / cuenta protegida */}
            <div className="absolute right-0 bottom-0 w-[220px] bg-white border border-gray-200 rounded-[14px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_14px_30px_rgba(20,22,26,0.07)] px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 flex-none grid place-items-center bg-[#e9eaec] rounded-[10px]">
                <svg className="w-[18px] h-[18px] stroke-[#1f2328]" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10.5" width="16" height="10" rx="3" />
                  <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                </svg>
              </div>
              <div>
                <small className="block text-xs text-gray-500">Tu cuenta</small>
                <strong className="text-sm font-semibold">Queda protegida</strong>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default function CrearPasswordPage() {
  return (
    <Suspense fallback={null}>
      <CrearPasswordForm />
    </Suspense>
  );
}