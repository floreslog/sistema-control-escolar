import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { BTN_PRIMARIO, CHIP, FOCO, TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getGrupos } from '@/lib/docente/queries';
import { plural } from '@/lib/docente/utils';
import type { GrupoResumen } from '@/lib/docente/types';

export default async function DocenteGruposPage() {
  await requireDocente();
  const grupos = await getGrupos();

  const porCiclo = new Map<string, GrupoResumen[]>();
  for (const g of grupos) {
    const lista = porCiclo.get(g.nombreCiclo) ?? [];
    lista.push(g);
    porCiclo.set(g.nombreCiclo, lista);
  }

  return (
    <div>
      <PageHeader
        titulo="Mis grupos"
        descripcion="Crea grupos, agrega alumnos y decide en qué materias se inscribe cada uno."
      />

      <div className="mb-6">
        <Link href="/docente/grupos/nuevo" className={BTN_PRIMARIO}>
          Nuevo grupo
        </Link>
      </div>

      {grupos.length === 0 ? (
        <section className={`${TARJETA} p-6`}>
          <h2 className="text-base font-semibold text-gray-900">Aún no tienes grupos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Crea tu primer grupo para agregar alumnos e inscribirlos en sus materias.
          </p>
        </section>
      ) : (
        Array.from(porCiclo.entries()).map(([nombreCiclo, lista]) => (
          <section key={nombreCiclo} className="mb-8">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Ciclo {nombreCiclo}</h2>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {lista.map((g) => (
                <Link
                  key={g.grupoId}
                  href={`/docente/grupos/${g.grupoId}`}
                  className={`${TARJETA} block p-5 transition-colors hover:border-[#b9bec5] ${FOCO}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{g.nombreGrupo}</h3>
                    {!g.esDueno && <span className={CHIP}>Imparto una materia</span>}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {[g.semestre ? `Semestre ${g.semestre}` : null, g.turno]
                      .filter(Boolean)
                      .join(' · ') || 'Sin semestre ni turno'}
                  </p>
                  <p className="mt-4 text-sm text-gray-700">
                    {plural(g.totalAlumnos, 'alumno', 'alumnos')} ·{' '}
                    {plural(g.totalMaterias, 'materia', 'materias')}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}