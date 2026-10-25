'use client';

import { useId, useRef, useState } from 'react';
import { nombreArchivoKardex } from '@/lib/alumno/kardexNombre';

interface CicloOpcion {
  cicloId: number;
  nombreCiclo: string;
  activo: boolean;
}

interface ExportarKardexProps {
  alumnoNombre: string;
  ciclos: CicloOpcion[];
}

type Periodo = 'todo' | 'ciclos';
type Materias = 'todas' | 'aprobadas';
type Fase = 'idle' | 'generando' | 'listo';
type ResultadoGuardado = 'guardado' | 'cancelado' | 'necesita-clic';

interface DestinoArchivo {
  createWritable(): Promise<{
    write(datos: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
}
type VentanaConSelector = Window & {
  showSaveFilePicker?: (opciones: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<DestinoArchivo>;
};

const FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#1f2328]';

function descargarComoArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function guardar(blob: Blob, nombre: string): Promise<ResultadoGuardado> {
  const ventana = window as VentanaConSelector;

  if (typeof ventana.showSaveFilePicker !== 'function') {
    descargarComoArchivo(blob, nombre);
    return 'guardado';
  }

  try {
    const destino = await ventana.showSaveFilePicker({
      suggestedName: nombre,
      types: [
        {
          description: 'Documento PDF',
          accept: { 'application/pdf': ['.pdf'] },
        },
      ],
    });
    const escritor = await destino.createWritable();
    await escritor.write(blob);
    await escritor.close();
    return 'guardado';
  } catch (e) {
    if (e instanceof DOMException) {
      if (e.name === 'AbortError') return 'cancelado';
      if (e.name === 'SecurityError' || e.name === 'NotAllowedError')
        return 'necesita-clic';
    }
    descargarComoArchivo(blob, nombre);
    return 'guardado';
  }
}

async function mensajeDeError(res: Response): Promise<string> {
  try {
    const cuerpo = (await res.json()) as { error?: string };
    if (cuerpo.error) return cuerpo.error;
  } catch {} //TODO: ponerle el cuerpo
  return res.status === 401
    ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
    : 'No se pudo generar el PDF. Inténtalo de nuevo.';
}

function Opcion({
  name,
  checked,
  onChange,
  titulo,
  detalle,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  titulo: string;
  detalle?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-[#1f2328]"
      />
      <span>
        <span className="font-semibold text-[#1a1d21]">{titulo}</span>
        {detalle && (
          <span className="block text-xs text-[#666c73]">{detalle}</span>
        )}
      </span>
    </label>
  );
}

export default function ExportarKardex({
  alumnoNombre,
  ciclos,
}: ExportarKardexProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tituloId = useId();

  const [periodo, setPeriodo] = useState<Periodo>('todo');
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [materias, setMaterias] = useState<Materias>('todas');
  const [fase, setFase] = useState<Fase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ blob: Blob; nombre: string } | null>(
    null,
  );

  const faltaCiclo = periodo === 'ciclos' && seleccion.length === 0;

  function abrir() {
    dialogRef.current?.showModal();
  }

  function cerrar() {
    dialogRef.current?.close();
  }

  function alCerrar() {
    abortRef.current?.abort();
    abortRef.current = null;
    setFase('idle');
    setListo(null);
    setError(null);
  }

  function alternarCiclo(id: number) {
    setSeleccion((actual) =>
      actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id],
    );
  }

  async function exportar() {
    setError(null);
    setFase('generando');

    const control = new AbortController();
    abortRef.current = control;

    try {
      const params = new URLSearchParams({
        ciclos:
          periodo === 'todo'
            ? 'todo'
            : [...seleccion].sort((a, b) => a - b).join(','),
        materias,
      });

      const res = await fetch(`/api/alumno/kardex/pdf?${params.toString()}`, {
        cache: 'no-store',
        signal: control.signal,
      });
      if (!res.ok) throw new Error(await mensajeDeError(res));
      if (!res.headers.get('content-type')?.includes('application/pdf')) {
        throw new Error(
          'El servidor no regresó un PDF. Vuelve a iniciar sesión e inténtalo de nuevo.',
        );
      }

      const blob = await res.blob();
      const nombre = nombreArchivoKardex(alumnoNombre, new Date());

      const resultado = await guardar(blob, nombre);
      if (resultado === 'guardado') {
        cerrar();
      } else {
        setListo({ blob, nombre });
        setFase('listo');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'No se pudo generar el PDF.');
      setFase('idle');
    }
  }

  async function guardarListo() {
    if (!listo) return;
    const resultado = await guardar(listo.blob, listo.nombre);
    if (resultado === 'guardado') cerrar();
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#1f2328] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3a4048] ${FOCO}`}
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
          <path d="M12 4v11M7 11l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
        Exportar kardex
      </button>

      <dialog
        ref={dialogRef}
        onClose={alCerrar}
        onClick={(e) => {
          // Clic en el fondo oscuro (el propio <dialog>, no su contenido).
          if (e.target === e.currentTarget) cerrar();
        }}
        aria-labelledby={tituloId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[#dcdfe3] bg-white p-0 text-[#1a1d21] shadow-xl backdrop:bg-[rgba(20,22,26,0.35)]"
      >
        <div className="p-6">
          <h2 id={tituloId} className="text-lg font-bold tracking-[-0.01em]">
            Exportar kardex
          </h2>
          <p className="mt-1 text-sm text-[#666c73]">
            Elige qué incluir en el PDF. Después podrás escoger dónde guardarlo.
          </p>

          <fieldset disabled={fase !== 'idle'} className="mt-5 min-w-0">
            <legend className="text-xs font-semibold text-[#666c73]">
              Periodo
            </legend>
            <div className="mt-2 space-y-3">
              <Opcion
                name="kardex-periodo"
                checked={periodo === 'todo'}
                onChange={() => setPeriodo('todo')}
                titulo="Todo el historial"
                detalle="Todos tus ciclos, incluido el actual."
              />
              <Opcion
                name="kardex-periodo"
                checked={periodo === 'ciclos'}
                onChange={() => setPeriodo('ciclos')}
                titulo="Ciclos específicos"
              />
            </div>

            {periodo === 'ciclos' && (
              <ul className="ml-7 mt-3 space-y-2">
                {ciclos.map((c) => (
                  <li key={c.cicloId}>
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={seleccion.includes(c.cicloId)}
                        onChange={() => alternarCiclo(c.cicloId)}
                        className="h-4 w-4 cursor-pointer accent-[#1f2328]"
                      />
                      <span className="font-medium">{c.nombreCiclo}</span>
                      {c.activo && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Actual
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <fieldset disabled={fase !== 'idle'} className="mt-5 min-w-0">
            <legend className="text-xs font-semibold text-[#666c73]">
              Materias
            </legend>
            <div className="mt-2 space-y-3">
              <Opcion
                name="kardex-materias"
                checked={materias === 'todas'}
                onChange={() => setMaterias('todas')}
                titulo="Todas las materias"
                detalle="Aprobadas, reprobadas y en curso."
              />
              <Opcion
                name="kardex-materias"
                checked={materias === 'aprobadas'}
                onChange={() => setMaterias('aprobadas')}
                titulo="Solo aprobadas"
              />
            </div>
          </fieldset>

          {faltaCiclo && fase === 'idle' && (
            <p className="mt-4 text-sm text-[#666c73]">
              Selecciona al menos un ciclo.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          {fase === 'listo' && (
            <p className="mt-4 rounded-lg border border-[#dcdfe3] bg-[#f8f9fa] px-3 py-2 text-sm text-[#1a1d21]">
              Tu kardex está listo. Elige dónde guardarlo.
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrar}
              className={`h-11 cursor-pointer rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 ${FOCO}`}
            >
              Cancelar
            </button>

            {fase === 'listo' ? (
              <button
                type="button"
                onClick={guardarListo}
                className={`h-11 cursor-pointer rounded-lg bg-[#1f2328] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3a4048] ${FOCO}`}
              >
                Guardar como…
              </button>
            ) : (
              <button
                type="button"
                onClick={exportar}
                disabled={fase === 'generando' || faltaCiclo}
                className={`h-11 cursor-pointer rounded-lg bg-[#1f2328] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3a4048] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
              >
                {fase === 'generando' ? 'Generando…' : 'Exportar PDF'}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
