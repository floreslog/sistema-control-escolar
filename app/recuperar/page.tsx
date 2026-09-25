'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { calcularFortaleza } from '@/lib/passwordStrength';

type Rol = 'docente' | 'alumno';
type Paso = 'identificar' | 'responder';

function EyeToggleButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[38px] h-[38px] grid place-items-center text-gray-500 hover:text-[#1f2328] hover:bg-gray-100 rounded-lg cursor-pointer"
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {visible ? (
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
  );
}

function LockIcon() {
  return (
    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10" rx="3" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 8 8 6 8-6" />
    </svg>
  );
}

export default function RecuperarPage() {
  const router = useRouter();

  const [paso, setPaso] = useState<Paso>('identificar');
  const [rol, setRol] = useState<Rol>('docente');
  const [identificador, setIdentificador] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  const label = rol === 'docente' ? 'Número de empleado' : 'Matrícula';
  const fortaleza = calcularFortaleza(password);
  const coinciden = confirmPassword.length > 0 && password === confirmPassword;
  const noCoinciden = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleBuscarPregunta(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch('/api/auth/recuperar/pregunta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, identificador }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'No se pudo continuar.');
        return;
      }

      setPregunta(data.pregunta);
      setPaso('responder');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch('/api/auth/recuperar/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, identificador, respuesta, password, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'No se pudo restablecer la contraseña.');
        return;
      }

      setExito(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#1f2328]">

      {/* Panel de marca — idéntico al de login y crear-password */}
      <section className="relative text-white flex flex-col items-center justify-center text-center px-12 py-10 overflow-hidden order-1">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="rules3" width="40" height="38" patternUnits="userSpaceOnUse">
              <path d="M0 37.5H40" stroke="#fff" strokeOpacity=".06" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rules3)" />
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

          {exito ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 grid place-items-center">
                <svg className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Contraseña actualizada</h1>
              <p className="text-sm text-gray-500">Redirigiendo al login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Recuperar contraseña</h1>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
                {paso === 'identificar'
                  ? 'Indica tu rol y tu identificador para continuar.'
                  : 'Responde tu pregunta de seguridad y crea una nueva contraseña.'}
              </p>

              {paso === 'identificar' && (
                <form onSubmit={handleBuscarPregunta} noValidate>
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

                  <div className="mb-6">
                    <label htmlFor="identificador" className="block text-[13.5px] font-semibold mb-2">
                      {label}
                    </label>
                    <div className="relative">
                      <UserIcon />
                      <input
                        id="identificador"
                        type="text"
                        required
                        value={identificador}
                        onChange={(e) => setIdentificador(e.target.value)}
                        className="w-full h-[50px] pl-11 pr-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={cargando}
                    className="w-full h-[52px] font-bold text-white bg-[#1f2328] rounded-lg hover:bg-[#3a4048] active:scale-[.985] transition disabled:opacity-70 cursor-pointer"
                  >
                    {cargando ? 'Buscando…' : 'Continuar'}
                  </button>
                </form>
              )}

              {paso === 'responder' && (
                <form onSubmit={handleReset} noValidate>
                  <div className="mb-5">
                    <label htmlFor="respuesta" className="block text-[13.5px] font-semibold mb-2">
                      {pregunta}
                    </label>
                    <input
                      id="respuesta"
                      type="text"
                      required
                      value={respuesta}
                      onChange={(e) => setRespuesta(e.target.value)}
                      className="w-full h-[50px] px-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="block text-[13.5px] font-semibold mb-2">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <LockIcon />
                      <input
                        id="password"
                        type={mostrarPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full h-[50px] pl-11 pr-12 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
                      />
                      <EyeToggleButton visible={mostrarPassword} onClick={() => setMostrarPassword((v) => !v)} />
                    </div>

                    {password.length > 0 && (
                      <div className="mt-2.5">
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
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
                      <LockIcon />
                      <input
                        id="confirmPassword"
                        type={mostrarConfirm ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full h-[50px] pl-11 pr-12 text-[15px] border-[1.5px] rounded-lg outline-none transition focus:ring-4 ${
                          noCoinciden
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-300 focus:border-[#1f2328] focus:ring-gray-200'
                        }`}
                      />
                      <EyeToggleButton visible={mostrarConfirm} onClick={() => setMostrarConfirm((v) => !v)} />
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
                    {cargando ? 'Guardando…' : 'Restablecer contraseña'}
                  </button>
                </form>
              )}

              <p className="mt-7 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                <a href="/login" className="font-semibold text-[#1f2328] hover:underline underline-offset-4">
                  Volver al login
                </a>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}