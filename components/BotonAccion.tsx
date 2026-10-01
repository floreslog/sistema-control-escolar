'use client';

import { useState, useTransition } from 'react';
import { BTN_PELIGRO } from '@/components/estilos';
import type { EstadoAccion } from '@/lib/docente/types';


//para acciones destructivas pequeñas como quitar cosas

export default function BotonAccion({
  accion,
  etiqueta,
  enCurso = 'Procesando…',
  confirmar,
}: {
  accion: () => Promise<EstadoAccion>;
  etiqueta: string;
  enCurso?: string;
  confirmar?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoAccion>(null);

  function onClick() {
    if (confirmar && !window.confirm(confirmar)) return;
    iniciar(async () => {
      setEstado(await accion());
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={onClick} disabled={pendiente} className={BTN_PELIGRO}>
        {pendiente ? enCurso : etiqueta}
      </button>
      {estado && !estado.ok && (
        <p role="alert" className="max-w-[240px] text-right text-xs text-red-700">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}