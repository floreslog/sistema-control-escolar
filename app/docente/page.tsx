import StatCard from '@/components/docente/StatCard';

/* 
TODO HARDCODEADO SOLO PARA VISUALIZAR
*/

type Grupo = {
  grupoID: number;
  nombreGrupo: string; 
  activo: boolean;
};

type Asignatura = {
  asignaturaID: number;
  nombreAsignatura: string; 
};

type CapturaPendiente = {
  grupoAsignaturaID: number;
  nombreGrupo: string;
  nombreAsignatura: string;
  numeroParcial: number; 
  nombreOportunidad: string; 
};

const GRUPOS_PLACEHOLDER: Grupo[] = [
  { grupoID: 1, nombreGrupo: 'Grupo ejemplo 1', activo: true },
  { grupoID: 2, nombreGrupo: 'Grupo ejemplo 2', activo: true },
];

const ASIGNATURAS_PLACEHOLDER: Asignatura[] = [
  { asignaturaID: 1, nombreAsignatura: 'Materia ejemplo 1' },
];

const PENDIENTES_PLACEHOLDER: CapturaPendiente[] = [
  {
    grupoAsignaturaID: 1,
    nombreGrupo: 'Grupo ejemplo 1',
    nombreAsignatura: 'Materia ejemplo 1',
    numeroParcial: 1,
    nombreOportunidad: 'Ordinario',
  },
  {
    grupoAsignaturaID: 2,
    nombreGrupo: 'Grupo ejemplo 2',
    nombreAsignatura: 'Materia ejemplo 1',
    numeroParcial: 1,
    nombreOportunidad: 'Primera Extraordinaria',
  },
];

export default async function DocenteDashboardPage() {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Grupos activos" value={GRUPOS_PLACEHOLDER.length} />
        <StatCard label="Materias" value={ASIGNATURAS_PLACEHOLDER.length} />
        <StatCard label="Alumnos" value="—" />
        <StatCard
          label="Capturas pendientes"
          value={PENDIENTES_PLACEHOLDER.length}
          tone="warning"
        />
      </div>

      <div className="bg-white rounded-xl p-6">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Grupos con captura pendiente
        </p>
        <div className="divide-y divide-gray-100">
          {PENDIENTES_PLACEHOLDER.map((p) => (
            <div
              key={p.grupoAsignaturaID}
              className="flex items-center justify-between py-3 text-sm"
            >
              <span className="text-gray-700">
                {p.nombreGrupo} - {p.nombreAsignatura}
              </span>
              <span
                className={`font-medium ${
                  p.nombreOportunidad === 'Ordinario' ? 'text-amber-600' : 'text-blue-600'
                }`}
              >
                {p.nombreOportunidad === 'Ordinario'
                  ? `Parcial ${p.numeroParcial}`
                  : p.nombreOportunidad}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}