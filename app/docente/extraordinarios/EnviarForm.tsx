'use client';

import { useActionState, useEffect, useState, type FormEvent } from 'react';
import EstadoBadge from '@/components/EstadoBadge';
import MensajeEstado from '@/components/MensajeEstado';
import { BTN_PRIMARIO, TARJETA } from '@/components/estilos';
import { formatearCalif } from '@/lib/docente/calificaciones/utils';
import type { AlumnoPorEnviar } from '@/lib/docente/extraordinarios/types';
import type { EstadoAccion } from '@/lib/docente/types';
import type { Estado } from '@/lib/alumno/types';

export default function EnviarForm({
  alumnos,
  calificacionMinima,
  accion,
}: {
  alumnos: AlumnoPorEnviar[];
  calificacionMinima: number;
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(accion, null);
  // Por defecto no hay nadie seleccionado: enviar a extraordinario es una decisión deliberada.
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (estado?.ok) setSeleccion(new Set());
  }, [estado]);

  const todos = alumnos.length > 0 && alumnos.every((a) => seleccion.has(a.inscripcionId));

  function alternar(id: number) {
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function alternarTodos() {
    setSeleccion(todos ? new Set() : new Set(alumnos.map((a) => a.inscripcionId)));
  }

  function confirmar(e: FormEvent<HTMLFormElement>) {
    const n = seleccion.size;
    const ok = window.confirm(
      `¿Enviar ${n} ${n === 1 ? 'alumno' : 'alumnos'} a extraordinario? Podrás cancelar el envío mientras no capturas su calificación.`,
    );
    if (!ok) e.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={confirmar} className="space-y-4">
      {Array.from(seleccion).map((id) => (
        <input key={id} type="hidden" name="inscripcionId" value={id} />
      ))}

      <div className={`${TARJETA} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={todos}
                  onChange={alternarTodos}
                  aria-label="Seleccionar todos"
                  className="h-4 w-4 cursor-pointer accent-[#1f2328]"
                />
              </th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Alumno</th>
              <th className="px-4 py-3 text-center">Promedio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Pasaría a</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alumnos.map((a) => (
              <tr key={a.inscripcionId} className={seleccion.has(a.inscripcionId) ? 'bg-[#f3f4f6]' : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccion.has(a.inscripcionId)}
                    onChange={() => alternar(a.inscripcionId)}
                    aria-label={`Seleccionar a ${a.nombreCompleto}`}
                    className="h-4 w-4 cursor-pointer accent-[#1f2328]"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.matricula}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{a.nombreCompleto}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`font-semibold ${
                      a.promedio !== null && a.promedio < calificacionMinima ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {a.promedio === null ? '—' : formatearCalif(a.promedio)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={a.estado as Estado} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.siguienteOportunidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MensajeEstado estado={estado} />

      <button type="submit" disabled={pendiente || seleccion.size === 0} className={BTN_PRIMARIO}>
        {pendiente
          ? 'Enviando…'
          : seleccion.size === 0
            ? 'Selecciona alumnos'
            : `Enviar ${seleccion.size} a extraordinario`}
      </button>
    </form>
  );
}