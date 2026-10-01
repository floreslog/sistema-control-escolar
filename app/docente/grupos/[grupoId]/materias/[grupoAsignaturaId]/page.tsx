import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getInscripcionesMateria } from '@/lib/docente/queries';
import { parseId } from '@/lib/docente/utils';
import { guardarInscripcionesAction } from '@/app/docente/grupos/actions';
import InscripcionesForm from './InscripcionesForm';

export default async function InscripcionesMateriaPage({
  params,
}: {
  params: Promise<{ grupoId: string; grupoAsignaturaId: string }>;
}) {
  await requireDocente();

  const p = await params;
  const grupoId = parseId(p.grupoId);
  const grupoAsignaturaId = parseId(p.grupoAsignaturaId);
  if (!grupoId || !grupoAsignaturaId) notFound();

  // Devuelve null si el docente en sesión no imparte esa materia.
  const data = await getInscripcionesMateria(grupoId, grupoAsignaturaId);
  if (!data) notFound();

  const { materia, alumnos } = data;

  return (
    <div>
      <Link
        href={`/docente/grupos/${grupoId}`}
        className="text-sm font-medium text-[#666c73] hover:text-[#1a1d21]"
      >
        ← Grupo {materia.nombreGrupo}
      </Link>

      <PageHeader
        titulo={materia.nombre}
        descripcion={`${materia.clave} · Grupo ${materia.nombreGrupo} · Ciclo ${materia.nombreCiclo}. Marca a los alumnos del grupo que cursan esta materia.`}
      />

      {alumnos.length === 0 ? (
        <section className="rounded-xl border border-[#dcdfe3] bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">El grupo no tiene alumnos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Primero{' '}
            <Link
              href={`/docente/grupos/${grupoId}/alumnos`}
              className="font-semibold text-[#1f2328] underline"
            >
              agrega alumnos al grupo
            </Link>
            .
          </p>
        </section>
      ) : (
        <InscripcionesForm
          alumnos={alumnos}
          accion={guardarInscripcionesAction.bind(null, grupoId, grupoAsignaturaId)}
        />
      )}
    </div>
  );
}