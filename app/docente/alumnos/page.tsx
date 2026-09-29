import PageHeader from '@/components/PageHeader';
import { requireDocente } from '@/lib/docente/requireDocente';

export default async function DocenteAlumnosPage() {
  await requireDocente();

  return (
    <div>
      <PageHeader
        titulo="Alumnos"
        descripcion="Consulta a los alumnos de tus grupos, su kardex y restablece su contraseña."
      />
    </div>
  );
}