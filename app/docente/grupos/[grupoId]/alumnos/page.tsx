import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { BTN_PRIMARIO, BTN_SECUNDARIO, INPUT } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getAlumnosDisponibles, getGrupoBasico } from '@/lib/docente/queries';
import { TAM_PAGINA, parseId, plural } from '@/lib/docente/utils';
import { agregarAlumnosAction } from '@/app/docente/grupos/actions';
import AgregarAlumnosForm from './AgregarAlumnosForm';

type SearchParams = { q?: string | string[]; sin?: string | string[]; pagina?: string | string[] };

function uno(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}

export default async function AgregarAlumnosPage({
  params,
  searchParams,
}: {
  params: Promise<{ grupoId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireDocente();

  const { grupoId: grupoIdRaw } = await params;
  const grupoId = parseId(grupoIdRaw);
  if (!grupoId) notFound();

  const grupo = await getGrupoBasico(grupoId);
  if (!grupo) notFound();
  // Solo el titular del grupo administra a sus alumnos.
  if (!grupo.esDueno) redirect(`/docente/grupos/${grupoId}`);

  const sp = await searchParams;
  const q = uno(sp.q).trim().slice(0, 100);
  const soloSinGrupo = uno(sp.sin) === '1';
  const pagina = parseId(uno(sp.pagina)) ?? 1;

  const { alumnos, total } = await getAlumnosDisponibles(grupoId, { q, soloSinGrupo, pagina });
  const totalPaginas = Math.max(1, Math.ceil(total / TAM_PAGINA));

  function href(p: number): string {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (soloSinGrupo) qs.set('sin', '1');
    if (p > 1) qs.set('pagina', String(p));
    const s = qs.toString();
    return `/docente/grupos/${grupoId}/alumnos${s ? `?${s}` : ''}`;
  }

  return (
    <div>
      <Link
        href={`/docente/grupos/${grupoId}`}
        className="text-sm font-medium text-[#666c73] hover:text-[#1a1d21]"
      >
        ← Grupo {grupo.nombreGrupo}
      </Link>

      <PageHeader
        titulo="Agregar alumnos"
        descripcion={`Selecciona los alumnos que formarán parte del grupo ${grupo.nombreGrupo}. Después decidirás en qué materias se inscribe cada uno.`}
      />

      {/* Búsqueda y filtro (GET: la URL conserva el estado) */}
      <form method="get" className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por matrícula o nombre"
          aria-label="Buscar alumno"
          className={`${INPUT} max-w-sm`}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="sin"
            value="1"
            defaultChecked={soloSinGrupo}
            className="h-4 w-4 accent-[#1f2328]"
          />
          Solo sin grupo en el ciclo {grupo.nombreCiclo}
        </label>
        <button type="submit" className={BTN_PRIMARIO}>
          Buscar
        </button>
        {(q || soloSinGrupo) && (
          <Link href={`/docente/grupos/${grupoId}/alumnos`} className={BTN_SECUNDARIO}>
            Limpiar
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-gray-600">
        {plural(total, 'alumno disponible', 'alumnos disponibles')}
        {totalPaginas > 1 && ` · página ${Math.min(pagina, totalPaginas)} de ${totalPaginas}`}
      </p>

      <AgregarAlumnosForm
        // key: al cambiar de página/filtro se reinicia la selección
        key={`${q}|${soloSinGrupo}|${pagina}`}
        alumnos={alumnos}
        accion={agregarAlumnosAction.bind(null, grupoId)}
      />

      {totalPaginas > 1 && (
        <nav className="mt-5 flex items-center justify-between" aria-label="Paginación">
          {pagina > 1 ? (
            <Link href={href(pagina - 1)} className={BTN_SECUNDARIO}>
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          {pagina < totalPaginas ? (
            <Link href={href(pagina + 1)} className={BTN_SECUNDARIO}>
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}