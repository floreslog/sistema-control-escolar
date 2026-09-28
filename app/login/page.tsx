'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Rol = 'docente' | 'alumno';

const ROLES: Record<Rol, { label: string; placeholder: string }> = {
  docente: { label: 'Número de empleado', placeholder: 'Ej. EMP-1024' },
  alumno: { label: 'Matrícula', placeholder: 'Ej. A21001234' },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rol, setRol] = useState<Rol>('docente');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const config = ROLES[rol];

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
            <h1 className="text-[28px] font-bold tracking-tight leading-tight">Iniciar sesión</h1>
            <p className="text-[14.5px] text-gray-500 leading-relaxed mt-1.5">
              Selecciona tu rol e ingresa tus datos.
            </p>
          </div>

          {/* Toggle de rol */}
          <div className="grid grid-cols-2 gap-2 p-1 mt-6 mb-6 bg-gray-100 rounded-[10px]" role="radiogroup" aria-label="Rol">
            {(['docente', 'alumno'] as Rol[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rol === r}
                onClick={() => setRol(r)}
                className={`h-10 rounded-[7px] text-sm font-semibold transition cursor-pointer ${
                  rol === r ? 'bg-white text-[#1f2328] shadow-[0_1px_3px_rgba(20,22,26,0.14)]' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {r === 'docente' ? 'Docente' : 'Alumno'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="identificador" className="block text-[13.5px] font-semibold mb-2">
                {config.label}
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
                  autoComplete="username"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder={config.placeholder}
                  className="w-full h-[50px] pl-11 pr-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-[#e9eaec]"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
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
            </div>

            <div className="flex items-center justify-between mb-6 text-[13.5px]">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-5 h-5 flex-none grid place-items-center border-[1.5px] border-gray-300 rounded peer-checked:bg-[#1f2328] peer-checked:border-[#1f2328] peer-focus-visible:ring-4 peer-focus-visible:ring-[#e9eaec] transition">
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
              className="w-full h-[52px] font-bold text-white bg-[#1f2328] rounded-lg hover:bg-[#3a4048] active:scale-[.985] transition disabled:opacity-80 disabled:cursor-progress cursor-pointer"
            >
              {cargando ? 'Entrando…' : 'Ingresar'}
            </button>
          </form>

          {rol === 'alumno' && (
            <p className="mt-6 pt-[22px] border-t border-gray-200 text-center text-sm text-gray-500">
              ¿Primera vez aquí?{' '}
              <a href="/crear-password" className="font-semibold text-[#1f2328] hover:underline underline-offset-4">
                Crea tu contraseña
              </a>
            </p>
          )}
        </div>
      </section>

      {/* ---------- Aside ilustrativo (oculto en móvil) ---------- */}
      <aside className="hidden lg:grid relative place-items-center p-12 overflow-hidden">
        <div className="absolute w-[360px] h-[360px] -left-[140px] top-[14%] rounded-full blur-[70px] bg-[#d5dee8]" aria-hidden="true" />
        <div className="absolute w-[420px] h-[420px] -right-[100px] -bottom-[120px] rounded-full blur-[70px] bg-[#e9edf2]" aria-hidden="true" />

        <div className="relative w-full max-w-[440px]">
          <h2 className="text-[30px] font-bold tracking-tight leading-tight">Bienvenido de nuevo</h2>
          <p className="text-[15px] text-gray-500 leading-relaxed mt-2.5 max-w-[340px]">
            Consulta tus calificaciones y lleva el control de tus boletas.
          </p>

          <div className="relative h-[250px] mt-10" aria-hidden="true">
            {/* Tarjeta de calificaciones */}
            <div className="absolute left-0 top-0 w-[250px] bg-white border border-gray-200 rounded-[14px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_14px_30px_rgba(20,22,26,0.07)] px-[18px] pt-4 pb-1.5">
              <div className="text-[12.5px] font-semibold text-gray-500 mb-2.5">Calificaciones</div>
              {[['Matemáticas', 94], ['Español', 90], ['Historia', 87]].map(([nombre, pct]) => (
                <div key={nombre as string} className="mb-3">
                  <div className="flex justify-between text-[13px] font-semibold mb-1.5">
                    <span>{nombre}</span>
                    <span>{(pct as number) / 10}</span>
                  </div>
                  <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1f2328] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Tarjeta de promedio (dona) */}
            <div className="absolute right-0 top-[34px] w-[150px] bg-white border border-gray-200 rounded-[14px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_14px_30px_rgba(20,22,26,0.07)] p-4 flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#eceef0" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#1f2328" strokeWidth="6" strokeLinecap="round" strokeDasharray="147 163.4" />
                </svg>
                <b className="absolute inset-0 grid place-items-center text-sm font-bold">9.0</b>
              </div>
              <span className="text-[12.5px] font-semibold text-gray-500">Promedio</span>
            </div>

            {/* Tarjeta de kardex listo */}
            <div className="absolute left-[60px] bottom-0 w-[270px] bg-white border border-gray-200 rounded-[14px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_14px_30px_rgba(20,22,26,0.07)] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 flex-none grid place-items-center bg-[#e9eaec] rounded-[10px]">
                <svg className="w-[18px] h-[18px] stroke-[#1f2328]" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3h7l4 4v14H7z" />
                  <path d="M14 3v4h4M10 12h5M10 16h5" />
                </svg>
              </div>
              <div>
                <small className="block text-xs text-gray-500">kardex-fernando.pdf</small>
                <strong className="text-sm font-semibold">Listo para descargar</strong>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}