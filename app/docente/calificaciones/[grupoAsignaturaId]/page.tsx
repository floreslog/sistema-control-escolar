import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getCapturaMateria } from '@/lib/docente/calificaciones/queries';
import { parseId } from '@/lib/docente/utils';
import { guardarCalificacionesAction } from '@/app/docente/calificaciones/actions';
import CapturaForm from './CapturaForm';

export default async function CapturaMateriaPage({
  params,
}: {
  params: Promise<{ grupoAsignaturaId: string }>;
}) {
  await requireDocente();

  const { grupoAsignaturaId: raw } = await params;
  const grupoAsignaturaId = parseId(raw);
  if (!grupoAsignaturaId) notFound();

  // Devuelve null si el docente en sesión no imparte esa materia.
  const data = await getCapturaMateria(grupoAsignaturaId);
  if (!data) notFound();

  const { materia, alumnos, parametros } = data;

  return (
    <div>
      <Link
        href="/docente/calificaciones"
        className="text-sm font-medium text-[#666c73] hover:text-[#1a1d21]"
      >
        ← Calificaciones
      </Link>

      <PageHeader
        titulo={materia.nombre}
        descripcion={`${materia.clave} · Grupo ${materia.nombreGrupo} · Ciclo ${materia.nombreCiclo}`}
      />

      {!materia.editable && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          El ciclo {materia.nombreCiclo} ya no está activo: las calificaciones son solo de consulta.
        </p>
      )}

      {alumnos.length === 0 ? (
        <section className={`${TARJETA} p-6`}>
          <h2 className="text-base font-semibold text-gray-900">No hay alumnos inscritos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Primero{' '}
            <Link
              href={`/docente/grupos/${materia.grupoId}/materias/${materia.grupoAsignaturaId}`}
              className="font-semibold text-[#1f2328] underline"
            >
              inscribe alumnos en la materia
            </Link>
            .
          </p>
        </section>
      ) : (
        <CapturaForm
          alumnos={alumnos}
          numParciales={parametros.numParciales}
          calificacionMinima={parametros.calificacionMinima}
          editable={materia.editable}
          accion={guardarCalificacionesAction.bind(null, grupoAsignaturaId)}
        />
      )}
    </div>
  );
}