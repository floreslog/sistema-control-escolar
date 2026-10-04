'use client';

import { useActionState, useState } from 'react';
import BotonAccion from '@/components/BotonAccion';
import EstadoBadge from '@/components/EstadoBadge';
import MensajeEstado from '@/components/MensajeEstado';
import { BTN_PRIMARIO, CHIP, FOCO, TARJETA } from '@/components/estilos';
import { cancelarEnvioAction } from '@/app/docente/extraordinarios/actions';
import { formatearCalif, parseCalificacion } from '@/lib/docente/calificaciones/utils';
import type { AlumnoExtra } from '@/lib/docente/extraordinarios/types';
import type { EstadoAccion } from '@/lib/docente/types';
import type { Estado } from '@/lib/alumno/types';

export default function CapturaExtraForm({
  grupoAsignaturaId,
  alumnos,
  calificacionMinima,
  accion,
}: {
  grupoAsignaturaId: number;
  alumnos: AlumnoExtra[];
  calificacionMinima: number;
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(accion, null);

  const [cals, setCals] = useState<Record<number, string>>(() =>
    Object.fromEntries(alumnos.map((a) => [a.extraordinarioId, formatearCalif(a.calificacion)])),
  );
  const [fechas, setFechas] = useState<Record<number, string>>(() =>
    Object.fromEntries(alumnos.map((a) => [a.extraordinarioId, a.fechaExamen])),
  );

  let cambios = 0;
  let hayInvalidos = false;

  const filas = alumnos.map((a) => {
    const texto = cals[a.extraordinarioId] ?? '';
    const fecha = fechas[a.extraordinarioId] ?? '';
    const parsed = parseCalificacion(texto);

    const invalida = !parsed.ok;
    const sucia = !parsed.ok || parsed.valor !== a.calificacion || fecha !== a.fechaExamen;

    if (invalida) hayInvalidos = true;
    if (sucia) cambios += 1;

    return { a, texto, fecha, invalida, sucia, valor: parsed.ok ? parsed.valor : null };
  });

  return (
    <form action={formAction} className="space-y-4">
      <div className={`${TARJETA} overflow-x-auto`}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
            <tr>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Alumno</th>
              <th className="px-4 py-3">Oportunidad</th>
              <th className="px-2 py-3 text-center">Calificación</th>
              <th className="px-2 py-3">Fecha de examen</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map(({ a, texto, fecha, invalida, sucia, valor }) => (
              <tr key={a.extraordinarioId} className={sucia ? 'bg-amber-50/50' : undefined}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.matricula}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{a.nombreCompleto}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.oportunidad}</td>

                <td className="px-2 py-2 text-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    name={`cal_${a.extraordinarioId}`}
                    value={texto}
                    maxLength={5}
                    autoComplete="off"
                    placeholder="—"
                    onChange={(e) => setCals((p) => ({ ...p, [a.extraordinarioId]: e.target.value }))}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label={`Calificación de ${a.nombreCompleto}`}
                    aria-invalid={invalida || undefined}
                    className={`h-9 w-16 rounded-md border bg-white text-center text-sm placeholder:text-[#9aa0a6] ${FOCO} ${
                      invalida
                        ? 'border-red-400 bg-red-50'
                        : valor !== null && valor < calificacionMinima
                          ? 'border-[#dcdfe3] text-red-600'
                          : 'border-[#dcdfe3] text-[#1a1d21]'
                    }`}
                  />
                </td>

                <td className="px-2 py-2">
                  <input
                    type="date"
                    name={`fecha_${a.extraordinarioId}`}
                    value={fecha}
                    onChange={(e) => setFechas((p) => ({ ...p, [a.extraordinarioId]: e.target.value }))}
                    aria-label={`Fecha de examen de ${a.nombreCompleto}`}
                    className={`h-9 rounded-md border border-[#dcdfe3] bg-white px-2 text-sm text-[#1a1d21] ${FOCO}`}
                  />
                </td>

                <td className="px-4 py-3">
                  {sucia ? <span className={CHIP}>Sin guardar</span> : <EstadoBadge estado={a.estado as Estado} />}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {a.calificacion === null && (
                      <BotonAccion
                        accion={() => cancelarEnvioAction(grupoAsignaturaId, a.extraordinarioId)}
                        etiqueta="Cancelar envío"
                        enCurso="Cancelando…"
                        confirmar={`¿Cancelar el envío de ${a.nombreCompleto} a ${a.oportunidad}?`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MensajeEstado estado={estado} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente || cambios === 0 || hayInvalidos} className={BTN_PRIMARIO}>
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
        <span className="text-sm text-gray-600" aria-live="polite">
          {hayInvalidos
            ? 'Corrige las celdas en rojo (0 a 10, máximo 2 decimales).'
            : cambios === 0
              ? 'Sin cambios pendientes.'
              : `${cambios} ${cambios === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}`}
        </span>
      </div>
    </form>
  );
}