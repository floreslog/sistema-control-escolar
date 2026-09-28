import type { ReactNode } from 'react';

//bloque desplegable


export default function Detalle({
  titulo = 'Detalle',
  children,
}: {
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded text-sm font-medium text-gray-600 transition hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2328]/40 [&::-webkit-details-marker]:hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-4 w-4 transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {titulo}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

// Pares valor en dos columnas, para el contenido de detalle
export function ListaDatos({ datos }: { datos: { etiqueta: string; valor: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {datos.map((d) => (
        <div key={d.etiqueta}>
          <dt className="text-xs text-gray-500">{d.etiqueta}</dt>
          <dd className="font-medium text-gray-900">{d.valor}</dd>
        </div>
      ))}
    </dl>
  );
}