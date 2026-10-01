import type { EstadoAccion } from '@/lib/docente/types';

export default function MensajeEstado({ estado }: { estado: EstadoAccion }) {
  if (!estado) return null;

  return (
    <p
      role={estado.ok ? 'status' : 'alert'}
      className={`rounded-lg border px-3 py-2 text-sm ${
        estado.ok
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {estado.mensaje}
    </p>
  );
}