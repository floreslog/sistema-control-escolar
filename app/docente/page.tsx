import PageHeader from '@/components/PageHeader';
import { requireDocente } from '@/lib/docente/requireDocente';

export default async function DocenteInicioPage() {
  await requireDocente();

  return (
    <div>
      <PageHeader
        titulo="Inicio"
        descripcion="Resumen de tus grupos, captura pendiente y extraordinarios."
      />
    </div>
  );
}