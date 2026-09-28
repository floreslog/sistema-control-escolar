import type { Estado } from '@/lib/alumno/types';

// el semaforo es: verde = aprobado, ámbar = en proceso / pendiente, rojo = reprobado.
const ESTILOS: Record<Estado, { caja: string; punto: string }> = {
  Aprobado: {
    caja: 'bg-green-50 text-green-700 border-green-200',
    punto: 'bg-green-600',
  },
  Reprobado: {
    caja: 'bg-red-50 text-red-700 border-red-200',
    punto: 'bg-red-600',
  },
  'En curso': {
    caja: 'bg-amber-50 text-amber-800 border-amber-200',
    punto: 'bg-amber-500',
  },
  'Pendiente de extraordinario': {
    caja: 'bg-amber-50 text-amber-800 border-amber-200',
    punto: 'bg-amber-500',
  },
  'En extraordinario': {
    caja: 'bg-amber-50 text-amber-800 border-amber-200',
    punto: 'bg-amber-500',
  },
  'Pendiente siguiente extraordinario': {
    caja: 'bg-amber-50 text-amber-800 border-amber-200',
    punto: 'bg-amber-500',
  },
};

const ESTILO_DEFECTO = {
  caja: 'bg-gray-100 text-gray-700 border-gray-200',
  punto: 'bg-gray-500',
};

export default function EstadoBadge({ estado }: { estado: Estado }) {
  const estilo = ESTILOS[estado] ?? ESTILO_DEFECTO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${estilo.caja}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`} aria-hidden="true" />
      {estado}
    </span>
  );
}