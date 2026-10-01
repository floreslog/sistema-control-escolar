'use client';

import { useActionState, useMemo, useState } from 'react';
import MensajeEstado from '@/components/MensajeEstado';
import { BTN_PRIMARIO, BTN_SECUNDARIO, CHIP, INPUT, TARJETA } from '@/components/estilos';
import type { AlumnoInscripcion, EstadoAccion } from '@/lib/docente/types';

export default function InscripcionesForm({
  alumnos,
  accion,
}: {
  alumnos: AlumnoInscripcion[];
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(accion, null);
  const [filtro, setFiltro] = useState('');
  const [seleccion, setSeleccion] = useState<Set<number>>(
    () => new Set(alumnos.filter((a) => a.inscrito).map((a) => a.alumnoId)),
  );

  const visibles = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    if (!f) return alumnos;
    return alumnos.filter(
      (a) => a.matricula.toLowerCase().includes(f) || a.nombreCompleto.toLowerCase().includes(f),
    );
  }, [alumnos, filtro]);

  function alternar(alumnoId: number) {
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(alumnoId)) nuevo.delete(alumnoId);
      else nuevo.add(alumnoId);
      return nuevo;
    });
  }

  // Marca/desmarca a los visibles; los que ya tienen calificaciones no se tocan.
  function marcarVisibles(valor: boolean) {
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      for (const a of visibles) {
        if (a.tieneCalificaciones) continue;
        if (valor) nuevo.add(a.alumnoId);
        else nuevo.delete(a.alumnoId);
      }
      return nuevo;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* La selección viaja en inputs ocultos (así el filtro no pierde marcas) */}
      {Array.from(seleccion).map((alumnoId) => (
        <input key={alumnoId} type="hidden" name="alumnoId" value={alumnoId} />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por matrícula o nombre"
          aria-label="Filtrar alumnos"
          className={`${INPUT} max-w-sm`}
        />
        <button type="button" onClick={() => marcarVisibles(true)} className={BTN_SECUNDARIO}>
          Marcar todos
        </button>
        <button type="button" onClick={() => marcarVisibles(false)} className={BTN_SECUNDARIO}>
          Desmarcar todos
        </button>
        <span className="text-sm text-gray-600">
          {seleccion.size} de {alumnos.length} inscritos
        </span>
      </div>

      <div className={`${TARJETA} overflow-x-auto`}>
        <table className="w-full min-w-[460px] text-left text-sm">
          <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
            <tr>
              <th className="w-12 px-4 py-3">
                <span className="sr-only">Inscrito</span>
              </th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Nombre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  Ningún alumno coincide con el filtro.
                </td>
              </tr>
            ) : (
              visibles.map((a) => (
                <tr key={a.alumnoId} className={seleccion.has(a.alumnoId) ? 'bg-[#f3f4f6]' : undefined}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={seleccion.has(a.alumnoId)}
                      disabled={a.tieneCalificaciones}
                      onChange={() => alternar(a.alumnoId)}
                      aria-label={`Inscribir a ${a.nombreCompleto}`}
                      className="h-4 w-4 cursor-pointer accent-[#1f2328] disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.matricula}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {a.nombreCompleto}
                    {a.tieneCalificaciones && (
                      <span className={`${CHIP} ml-2`}>Con calificaciones</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MensajeEstado estado={estado} />

      <button type="submit" disabled={pendiente} className={BTN_PRIMARIO}>
        {pendiente ? 'Guardando…' : 'Guardar inscripciones'}
      </button>
    </form>
  );
}