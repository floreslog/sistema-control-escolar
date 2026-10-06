export interface Segmento {
  etiqueta: string;
  valor: number;
  /** Clase Tailwind de fondo, ej. 'bg-green-600'. */
  color: string;
}

/** Segmentos estándar de estado (mismo semáforo que el resto del panel). */
export function segmentosEstado(c: {
  aprobados: number;
  enCurso: number;
  enExtra: number;
  reprobados: number;
}): Segmento[] {
  return [
    { etiqueta: 'Aprobados', valor: c.aprobados, color: 'bg-green-600' },
    { etiqueta: 'En curso', valor: c.enCurso, color: 'bg-gray-400' },
    { etiqueta: 'Extraordinario', valor: c.enExtra, color: 'bg-amber-500' },
    { etiqueta: 'Reprobados', valor: c.reprobados, color: 'bg-red-600' },
  ];
}

/**
 * Barra apilada al 100 %. Server component, sin JavaScript en el cliente.
 * El texto accesible describe los valores reales; la leyenda es opcional.
 */
export default function BarraEstados({
  segmentos,
  alto = 'h-3',
  leyenda = false,
}: {
  segmentos: Segmento[];
  alto?: string;
  leyenda?: boolean;
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const visibles = segmentos.filter((s) => s.valor > 0);
  const descripcion =
    total === 0
      ? 'Sin datos'
      : visibles.map((s) => `${s.valor} ${s.etiqueta.toLowerCase()}`).join(', ');

  return (
    <div>
      <div
        role="img"
        aria-label={descripcion}
        className={`flex w-full overflow-hidden rounded-full bg-[#e9eaec] ${alto}`}
      >
        {visibles.map((s) => (
          <div
            key={s.etiqueta}
            title={`${s.etiqueta}: ${s.valor}`}
            className={s.color}
            style={{ width: `${(s.valor / total) * 100}%` }}
          />
        ))}
      </div>

      {leyenda && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-700">
          {segmentos.map((s) => (
            <li key={s.etiqueta} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} aria-hidden="true" />
              {s.etiqueta} <span className="font-semibold text-gray-900">{s.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}