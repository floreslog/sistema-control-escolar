import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getCiclosActivos } from '@/lib/docente/queries';
import NuevoGrupoForm from './NuevoGrupoForm';

export default async function NuevoGrupoPage() {
  await requireDocente();
  const ciclos = await getCiclosActivos();

  return (
    <div>
      <Link href="/docente/grupos" className="text-sm font-medium text-[#666c73] hover:text-[#1a1d21]">
        ← Mis grupos
      </Link>

      <PageHeader
        titulo="Nuevo grupo"
        descripcion="Después de crearlo podrás agregar materias y alumnos."
      />

      {ciclos.length === 0 ? (
        <section className={`${TARJETA} p-6`}>
          <h2 className="text-base font-semibold text-gray-900">No hay ciclos escolares activos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Para crear un grupo debe existir al menos un ciclo activo. Consulta con control escolar.
          </p>
        </section>
      ) : (
        <NuevoGrupoForm ciclos={ciclos} />
      )}
    </div>
  );
}