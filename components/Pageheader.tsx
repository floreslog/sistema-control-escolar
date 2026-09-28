export default function PageHeader({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion?: string;
}) {
  return (
    <header className="mb-8 mt-7">
      <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.03em] text-[#1a1d21] min-[861px]:text-[30px]">
        {titulo}
      </h1>
      {descripcion && (
        <p className="mt-2 max-w-xl text-[15px] leading-[1.55] text-[#666c73]">{descripcion}</p>
      )}
    </header>
  );
}