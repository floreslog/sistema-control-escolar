'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { calcularFortaleza } from '@/lib/passwordStrength';

type Rol = 'docente' | 'alumno';
type Paso = 'identificar' | 'responder';

export default function RecuperarPage() {
  const router = useRouter();

  const [paso, setPaso] = useState<Paso>('identificar');
  const [rol, setRol] = useState<Rol>('docente');
  const [identificador, setIdentificador] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  const label = rol === 'docente' ? 'Número de empleado' : 'Matrícula';
  const fortaleza = calcularFortaleza(password);
  const coinciden = confirmPassword.length > 0 && password === confirmPassword;

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

  if (exito) {
    return (
      <main className="min-h-screen grid place-items-center bg-gray-50 px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 grid place-items-center">
            <svg className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Contraseña actualizada</h1>
          <p className="text-sm text-gray-500">Redirigiendo al login…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-[420px]">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Recuperar contraseña</h1>
        <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
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
              <label htmlFor="identificador" className="block text-[13.5px] font-semibold mb-2 text-gray-900">
                {label}
              </label>
              <input
                id="identificador"
                type="text"
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="w-full h-[50px] px-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
              />
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-[52px] font-bold text-white bg-[#1f2328] rounded-lg hover:bg-[#3a4048] transition disabled:opacity-70 cursor-pointer"
            >
              {cargando ? 'Buscando…' : 'Continuar'}
            </button>
          </form>
        )}

        {paso === 'responder' && (
          <form onSubmit={handleReset} noValidate>
            <div className="mb-5">
              <label htmlFor="respuesta" className="block text-[13.5px] font-semibold mb-2 text-gray-900">
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
              <label htmlFor="password" className="block text-[13.5px] font-semibold mb-2 text-gray-900">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full h-[50px] px-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
              />
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

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-[13.5px] font-semibold mb-2 text-gray-900">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-[50px] px-4 text-[15px] border-[1.5px] border-gray-300 rounded-lg outline-none transition focus:border-[#1f2328] focus:ring-4 focus:ring-gray-200"
              />
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando || !coinciden || password.length < 8}
              className="w-full h-[52px] font-bold text-white bg-[#1f2328] rounded-lg hover:bg-[#3a4048] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {cargando ? 'Guardando…' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-sm text-gray-500">
          <a href="/login" className="font-semibold text-[#1f2328] hover:underline underline-offset-4">
            Volver al login
          </a>
        </p>
      </div>
    </main>
  );
}