'use client';

import { useActionState, useEffect, useState } from 'react';
import MensajeEstado from '@/components/MensajeEstado';
import { BTN_PRIMARIO, TARJETA } from '@/components/estilos';
import type { AlumnoCatalogo, EstadoAccion } from '@/lib/docente/types';

export default function AgregarAlumnosForm({
  alumnos,
  accion,
}: {
  alumnos: AlumnoCatalogo[];
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(accion, null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());

  // Tras agregar con éxito, la lista se refresca y se limpia la selección.
  useEffect(() => {
    if (estado?.ok) setSeleccion(new Set());
  }, [estado]);

  const todosMarcados = alumnos.length > 0 && alumnos.every((a) => seleccion.has(a.alumnoId));

  function alternar(alumnoId: number) {
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(alumnoId)) nuevo.delete(alumnoId);
      else nuevo.add(alumnoId);
      return nuevo;
    });
  }

  function alternarTodos() {
    setSeleccion(todosMarcados ? new Set() : new Set(alumnos.map((a) => a.alumnoId)));
  }

  if (alumnos.length === 0) {
    return (
      <div className="space-y-3">
        <MensajeEstado estado={estado} />
        <p className={`${TARJETA} p-5 text-sm text-gray-600`}>
          No hay alumnos que coincidan con la búsqueda, o ya están todos en el grupo.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {Array.from(seleccion).map((alumnoId) => (
        <input key={alumnoId} type="hidden" name="alumnoId" value={alumnoId} />
      ))}

      <div className={`${TARJETA} overflow-x-auto`}>
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={alternarTodos}
                  aria-label="Seleccionar todos los de esta página"
                  className="h-4 w-4 cursor-pointer accent-[#1f2328]"
                />
              </th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Nombre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alumnos.map((a) => (
              <tr
                key={a.alumnoId}
                className={seleccion.has(a.alumnoId) ? 'bg-[#f3f4f6]' : undefined}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccion.has(a.alumnoId)}
                    onChange={() => alternar(a.alumnoId)}
                    aria-label={`Seleccionar a ${a.nombreCompleto}`}
                    className="h-4 w-4 cursor-pointer accent-[#1f2328]"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.matricula}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{a.nombreCompleto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MensajeEstado estado={estado} />

      <button type="submit" disabled={pendiente || seleccion.size === 0} className={BTN_PRIMARIO}>
        {pendiente
          ? 'Agregando…'
          : seleccion.size === 0
            ? 'Selecciona alumnos'
            : `Agregar ${seleccion.size} al grupo`}
      </button>
    </form>
  );
}