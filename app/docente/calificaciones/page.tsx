import PageHeader from '@/components/PageHeader';
import { requireDocente } from '@/lib/docente/requireDocente';

export default async function DocenteCalificacionesPage() {
  await requireDocente();

  return (
    <div>
      <PageHeader
        titulo="Calificaciones"
        descripcion="Captura y edita los parciales de las materias que impartes."
      />
    </div>
  );
}