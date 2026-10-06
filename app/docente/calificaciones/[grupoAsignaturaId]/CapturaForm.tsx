'use client';

import { useActionState, useRef, useState, type KeyboardEvent } from 'react';
import EstadoBadge from '@/components/EstadoBadge';
import MensajeEstado from '@/components/MensajeEstado';
import { BTN_PRIMARIO, CHIP, FOCO, TARJETA } from '@/components/estilos';
import { formatearCalif, parseCalificacion } from '@/lib/docente/calificaciones/utils';
import type { AlumnoCaptura } from '@/lib/docente/calificaciones/types';
import type { EstadoAccion } from '@/lib/docente/types';
import type { Estado } from '@/lib/alumno/types';

const clave = (inscripcionId: number, parcial: number) => `${inscripcionId}_${parcial}`;

export default function CapturaForm({
  alumnos,
  numParciales,
  calificacionMinima,
  editable,
  accion,
}: {
  alumnos: AlumnoCaptura[];
  numParciales: number;
  calificacionMinima: number;
  editable: boolean;
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(accion, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const a of alumnos) {
      a.parciales.forEach((cal, i) => {
        inicial[clave(a.inscripcionId, i + 1)] = formatearCalif(cal);
      });
    }
    return inicial;
  });

  const parciales = Array.from({ length: numParciales }, (_, i) => i + 1);

  // Se compara contra lo guardado (props). Tras guardar, la página se refresca
  // con los valores nuevos y los "cambios" vuelven a cero.
  let cambios = 0;
  let hayInvalidos = false;

  const filas = alumnos.map((a) => {
    const bloqueada = a.bloqueado || !editable;
    let filaSucia = false;
    const nums: number[] = [];

    const celdas = parciales.map((p) => {
      const texto = valores[clave(a.inscripcionId, p)] ?? '';
      const parsed = parseCalificacion(texto);
      const original = a.parciales[p - 1] ?? null;

      const invalida = !parsed.ok;
      const sucia = !bloqueada && (!parsed.ok || parsed.valor !== original);

      if (invalida && !bloqueada) hayInvalidos = true;
      if (sucia) {
        cambios += 1;
        filaSucia = true;
      }
      if (parsed.ok && parsed.valor !== null) nums.push(parsed.valor);

      return { p, texto, invalida, sucia };
    });

    // Vista previa del promedio con lo escrito (el estado oficial viene de la BD).
    const promedioVivo =
      nums.length > 0
        ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100
        : null;

    return { a, bloqueada, filaSucia, celdas, promedioVivo };
  });

  function actualizar(inscripcionId: number, parcial: number, texto: string) {
    setValores((prev) => ({ ...prev, [clave(inscripcionId, parcial)]: texto }));
  }

  // Enter / flechas arriba-abajo mueven entre alumnos en la misma columna.
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, fila: number, col: number) {
    if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();

    const paso = e.key === 'ArrowUp' ? -1 : 1;
    for (let f = fila + paso; f >= 0 && f < alumnos.length; f += paso) {
      const el = formRef.current?.querySelector<HTMLInputElement>(
        `input[data-fila="${f}"][data-col="${col}"]:not(:disabled)`,
      );
      if (el) {
        el.focus();
        el.select();
        return;
      }
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {editable && (
        <p className="text-sm text-gray-600">
          Deja un parcial vacío si aún no lo capturas: queda como pendiente, no como 0. Usa Enter o
          las flechas para bajar al siguiente alumno.
        </p>
      )}

      <div className={`${TARJETA} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
            <tr>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Alumno</th>
              {parciales.map((p) => (
                <th key={p} className="px-2 py-3 text-center">
                  P{p}
                </th>
              ))}
              <th className="px-4 py-3 text-center">Promedio</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map(({ a, bloqueada, filaSucia, celdas, promedioVivo }, fila) => (
              <tr key={a.inscripcionId} className={filaSucia ? 'bg-amber-50/50' : undefined}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.matricula}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{a.nombreCompleto}</td>

                {celdas.map((c) => (
                  <td key={c.p} className="px-2 py-2 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      name={`cal_${a.inscripcionId}_${c.p}`}
                      value={c.texto}
                      disabled={bloqueada}
                      maxLength={5}
                      autoComplete="off"
                      placeholder="—"
                      data-fila={fila}
                      data-col={c.p}
                      onChange={(e) => actualizar(a.inscripcionId, c.p, e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, fila, c.p)}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label={`Parcial ${c.p} de ${a.nombreCompleto}`}
                      aria-invalid={c.invalida || undefined}
                      className={`h-9 w-16 rounded-md border bg-white text-center text-sm text-[#1a1d21] placeholder:text-[#9aa0a6] disabled:bg-[#f3f4f6] disabled:text-[#666c73] ${FOCO} ${
                        c.invalida
                          ? 'border-red-400 bg-red-50'
                          : c.sucia
                            ? 'border-amber-400'
                            : 'border-[#dcdfe3]'
                      }`}
                    />
                  </td>
                ))}

                <td className="px-4 py-3 text-center">
                  <span
                    className={`font-semibold ${
                      promedioVivo !== null && promedioVivo < calificacionMinima
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {promedioVivo === null ? '—' : formatearCalif(promedioVivo)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {filaSucia ? (
                    <span className={CHIP}>Sin guardar</span>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <EstadoBadge estado={a.estado as Estado} />
                      {a.bloqueado && (
                        <span className="text-xs text-gray-500">Ordinario cerrado</span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MensajeEstado estado={estado} />

      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pendiente || cambios === 0 || hayInvalidos}
            className={BTN_PRIMARIO}
          >
            {pendiente ? 'Guardando…' : 'Guardar calificaciones'}
          </button>
          <span className="text-sm text-gray-600" aria-live="polite">
            {hayInvalidos
              ? 'Corrige las celdas en rojo (0 a 10, máximo 2 decimales).'
              : cambios === 0
                ? 'Sin cambios pendientes.'
                : `${cambios} ${cambios === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}`}
          </span>
        </div>
      )}
    </form>
  );
}