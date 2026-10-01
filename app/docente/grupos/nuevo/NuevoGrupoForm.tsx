'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import MensajeEstado from '@/components/MensajeEstado';
import { BTN_PRIMARIO, BTN_SECUNDARIO, ETIQUETA, INPUT, TARJETA } from '@/components/estilos';
import { crearGrupoAction } from '@/app/docente/grupos/actions';
import type { CicloOpcion, EstadoAccion } from '@/lib/docente/types';

export default function NuevoGrupoForm({ ciclos }: { ciclos: CicloOpcion[] }) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(
    crearGrupoAction,
    null,
  );
  const v = estado?.valores;

  return (
    <form action={formAction} className={`${TARJETA} max-w-xl space-y-5 p-6`}>
      <div>
        <label htmlFor="nombreGrupo" className={ETIQUETA}>
          Nombre del grupo
        </label>
        <input
          id="nombreGrupo"
          name="nombreGrupo"
          type="text"
          required
          maxLength={50}
          placeholder="Ej: 3B"
          defaultValue={v?.nombreGrupo}
          className={INPUT}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="semestre" className={ETIQUETA}>
            Semestre <span className="font-normal text-[#666c73]">(opcional)</span>
          </label>
          <input
            id="semestre"
            name="semestre"
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="Ej: 3"
            defaultValue={v?.semestre}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="turno" className={ETIQUETA}>
            Turno <span className="font-normal text-[#666c73]">(opcional)</span>
          </label>
          <select id="turno" name="turno" defaultValue={v?.turno ?? ''} className={INPUT}>
            <option value="">Sin definir</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="cicloId" className={ETIQUETA}>
          Ciclo escolar
        </label>
        <select
          id="cicloId"
          name="cicloId"
          required
          defaultValue={v?.cicloId ?? String(ciclos[0].cicloId)}
          className={INPUT}
        >
          {ciclos.map((c) => (
            <option key={c.cicloId} value={c.cicloId}>
              {c.nombreCiclo}
            </option>
          ))}
        </select>
      </div>

      <MensajeEstado estado={estado} />

      <div className="flex gap-3">
        <button type="submit" disabled={pendiente} className={BTN_PRIMARIO}>
          {pendiente ? 'Creando…' : 'Crear grupo'}
        </button>
        <Link href="/docente/grupos" className={BTN_SECUNDARIO}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}