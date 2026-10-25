import type { ReactNode } from 'react';

export default function PageHeader({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <header className="mb-8 mt-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.03em] text-[#1a1d21] min-[861px]:text-[30px]">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-2 max-w-xl text-[15px] leading-[1.55] text-[#666c73]">
            {descripcion}
          </p>
        )}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </header>
  );
}
