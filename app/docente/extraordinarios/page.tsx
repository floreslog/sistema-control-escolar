import PageHeader from '@/components/PageHeader';
import { requireDocente } from '@/lib/docente/requireDocente';

export default async function DocenteExtraordinariosPage() {
  await requireDocente();

  return (
    <div>
      <PageHeader
        titulo="Extraordinarios"
        descripcion="Alumnos pendientes de extraordinario y captura de sus resultados."
      />
    </div>
  );
}