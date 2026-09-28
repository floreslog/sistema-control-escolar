import Link from 'next/link';
import EstadoBadge from '@/components/EstadoBadge';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getMateriasActuales, getParametros, getPerfil } from '@/lib/alumno/queries';
import { formatCalif, type MateriaActual } from '@/lib/alumno/types';

export default async function AlumnoActualPage() {
  await requireAlumno();

  const [perfil, parametros, materias] = await Promise.all([
    getPerfil(),
    getParametros(),
    getMateriasActuales(),
  ]);

  // Agrupar por ciclo 
  const porCiclo = new Map<string, MateriaActual[]>();
  for (const m of materias) {
    const lista = porCiclo.get(m.nombreCiclo) ?? [];
    lista.push(m);
    porCiclo.set(m.nombreCiclo, lista);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ciclo actual</h1>
        {perfil && (
          <p className="mt-1 text-sm text-gray-500">
            {perfil.nombreCompleto}, matrícula {perfil.matricula}
          </p>
        )}
      </header>

      {materias.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Sin materias en curso</h2>
          <p className="mt-1 text-sm text-gray-600">
            No tienes inscripciones en un ciclo activo. Si crees que es un error, consulta con tu
            docente. Tus ciclos anteriores están en el{' '}
            <Link href="/alumno/historial" className="font-semibold text-[#1f2328] underline">
              historial
            </Link>
            .
          </p>
        </section>
      ) : (
        Array.from(porCiclo.entries()).map(([nombreCiclo, lista]) => (
          <section key={nombreCiclo} className="mb-8">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Ciclo {nombreCiclo}</h2>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {lista.map((m) => (
                <MateriaCard
                  key={m.inscripcionId}
                  materia={m}
                  numParciales={parametros.numParciales}
                  calificacionMinima={parametros.calificacionMinima}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function MateriaCard({
  materia: m,
  numParciales,
  calificacionMinima,
}: {
  materia: MateriaActual;
  numParciales: number;
  calificacionMinima: number;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {m.clave}
            {m.creditos !== null && `, ${m.creditos} créditos`}
          </p>
          <p className="text-xs text-gray-500">Grupo {m.nombreGrupo}</p>
        </div>
        <EstadoBadge estado={m.estado} />
      </div>

      {/* Parciales: los no capturados se muestran como pendientes, no como 0 */}
      <ul
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${numParciales}, minmax(0, 1fr))` }}
      >
        {m.parciales.map((cal, i) => (
          <li
            key={i}
            className={`rounded-lg border px-2 py-3 text-center ${
              cal === null ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'
            }`}
          >
            <p className="text-xs text-gray-500">Parcial {i + 1}</p>
            {cal === null ? (
              <p className="mt-1 text-sm text-gray-400">Pendiente</p>
            ) : (
              <p
                className={`mt-1 text-lg font-semibold ${
                  cal < calificacionMinima ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {formatCalif(cal)}
              </p>
            )}
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
        <div>
          <dt className="text-xs text-gray-500">Promedio parcial</dt>
          <dd className="text-base font-semibold text-gray-900">{formatCalif(m.promedio)}</dd>
          <dd className="text-xs text-gray-500">
            {m.parcialesCapturados} de {numParciales} parciales capturados
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Oportunidad actual</dt>
          <dd className="text-base font-semibold text-gray-900">{m.nombreOportunidad}</dd>
        </div>
        {m.calificacionFinal !== null && (
          <div className="col-span-2">
            <dt className="text-xs text-gray-500">Calificación final</dt>
            <dd className="text-base font-semibold text-gray-900">
              {formatCalif(m.calificacionFinal)}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}