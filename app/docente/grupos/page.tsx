import PageHeader from '@/components/PageHeader';
import { requireDocente } from '@/lib/docente/requireDocente';

export default async function DocenteGruposPage() {
  await requireDocente();

  return (
    <div>
      <PageHeader
        titulo="Mis grupos"
        descripcion="Crea grupos, agrega alumnos y decide en qué materias se inscribe cada uno."
      />
    </div>
  );
}