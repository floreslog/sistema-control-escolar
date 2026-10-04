import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { BTN_PRIMARIO, BTN_SECUNDARIO, CHIP, FOCO, INPUT, TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getGrupos } from '@/lib/docente/queries';
import { getAlumnosDocente } from '@/lib/docente/alumnos/queries';
import { TAM_PAGINA, parseId, plural } from '@/lib/docente/utils';

type SearchParams = { q?: string | string[]; grupo?: string | string[]; pagina?: string | string[] };

function uno(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// Badge de acceso: mismo estilo que EstadoBadge (semáforo verde / rojo)
function AccesoBadge({ sinContrasena }: { sinContrasena: boolean }) {
  const estilo = sinContrasena
    ? { caja: 'bg-red-50 text-red-700 border-red-200', punto: 'bg-red-600' }
    : { caja: 'bg-green-50 text-green-700 border-green-200', punto: 'bg-green-600' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${estilo.caja}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`} aria-hidden="true" />
      {sinContrasena ? 'Sin contraseña' : 'Contraseña establecida'}
    </span>
  );
}

export default async function DocenteAlumnosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireDocente();

  const sp = await searchParams;
  const q = uno(sp.q).trim().slice(0, 100);
  const grupoId = parseId(uno(sp.grupo)) ?? 0;
  const pagina = parseId(uno(sp.pagina)) ?? 1;

  const [grupos, { alumnos, total }] = await Promise.all([
    getGrupos(),
    getAlumnosDocente({ q, grupoId, pagina }),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / TAM_PAGINA));
  const hayFiltro = q !== '' || grupoId !== 0;

  function href(p: number): string {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (grupoId) qs.set('grupo', String(grupoId));
    if (p > 1) qs.set('pagina', String(p));
    const s = qs.toString();
    return `/docente/alumnos${s ? `?${s}` : ''}`;
  }

  return (
    <div>
      <PageHeader
        titulo="Alumnos"
        descripcion="Consulta a los alumnos de tus grupos y materias, su kardex y restablece su contraseña."
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
        <select
          name="grupo"
          defaultValue={grupoId ? String(grupoId) : ''}
          aria-label="Filtrar por grupo"
          className={`${INPUT} max-w-[240px]`}
        >
          <option value="">Todos los grupos</option>
          {grupos.map((g) => (
            <option key={g.grupoId} value={g.grupoId}>
              {g.nombreGrupo} · {g.nombreCiclo}
            </option>
          ))}
        </select>
        <button type="submit" className={BTN_PRIMARIO}>
          Buscar
        </button>
        {hayFiltro && (
          <Link href="/docente/alumnos" className={BTN_SECUNDARIO}>
            Limpiar
          </Link>
        )}
      </form>

      {alumnos.length === 0 ? (
        <section className={`${TARJETA} p-6`}>
          <h2 className="text-base font-semibold text-gray-900">
            {hayFiltro ? 'Sin resultados' : 'Aún no tienes alumnos'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {hayFiltro ? (
              'Ningún alumno coincide con la búsqueda o el filtro.'
            ) : (
              <>
                Aquí aparecerán los alumnos de los grupos que registres y de las materias que
                impartas. Empieza en{' '}
                <Link href="/docente/grupos" className="font-semibold text-[#1f2328] underline">
                  Mis grupos
                </Link>
                .
              </>
            )}
          </p>
        </section>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">
            {plural(total, 'alumno', 'alumnos')}
            {totalPaginas > 1 && ` · página ${Math.min(pagina, totalPaginas)} de ${totalPaginas}`}
          </p>

          <div className={`${TARJETA} overflow-x-auto`}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
                <tr>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Grupos</th>
                  <th className="px-4 py-3">Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alumnos.map((a) => (
                  <tr key={a.alumnoId}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.matricula}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/docente/alumnos/${a.alumnoId}`}
                        className={`rounded font-medium text-gray-900 underline-offset-2 hover:underline ${FOCO}`}
                      >
                        {a.nombreCompleto}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {a.grupos.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {a.grupos.map((g) => (
                            <span key={g} className={CHIP}>
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                      <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!a.activo && <span className={CHIP}>Inactivo</span>}
                        <AccesoBadge sinContrasena={a.sinContrasena} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}