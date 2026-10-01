'use client';

import { useActionState } from 'react';
import MensajeEstado from '@/components/MensajeEstado';
import { BTN_PRIMARIO, ETIQUETA, INPUT, TARJETA } from '@/components/estilos';
import type { AsignaturaOpcion, EstadoAccion } from '@/lib/docente/types';

export default function AgregarMateriaForm({
  asignaturas,
  accion,
}: {
  asignaturas: AsignaturaOpcion[];
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(accion, null);

  if (asignaturas.length === 0) {
    return (
      <p className="mt-4 text-sm text-gray-600">
        No hay más asignaturas disponibles para agregar a este grupo.
      </p>
    );
  }

  return (
    <form action={formAction} className={`${TARJETA} mt-4 max-w-xl space-y-3 p-5`}>
      <div>
        <label htmlFor="asignaturaId" className={ETIQUETA}>
          Agregar materia al grupo
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select id="asignaturaId" name="asignaturaId" required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Selecciona una materia
            </option>
            {asignaturas.map((s) => (
              <option key={s.asignaturaId} value={s.asignaturaId}>
                {s.clave} · {s.nombre}
              </option>
            ))}
          </select>
          <button type="submit" disabled={pendiente} className={BTN_PRIMARIO}>
            {pendiente ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
      </div>
      <MensajeEstado estado={estado} />
    </form>
  );
}