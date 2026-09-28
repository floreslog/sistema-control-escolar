import Link from 'next/link';
import EstadoBadge from '@/components/EstadoBadge';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getCiclos, getResumen } from '@/lib/alumno/queries';
import { formatCalif } from '@/lib/alumno/types';

export default async function AlumnoGeneralPage() {
  await requireAlumno();

  const [resumen, ciclos] = await Promise.all([getResumen(), getCiclos()]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resumen general</h1>
        <p className="mt-1 text-sm text-gray-500">Tu avance académico acumulado.</p>
      </header>

      {resumen.totalMaterias === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">
            Aún no tienes materias registradas, por eso no hay resumen que mostrar.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Promedio general</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {formatCalif(resumen.promedioGeneral)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {resumen.promedioGeneral === null
                  ? 'Aún no tienes materias con calificación final.'
                  : 'Sobre materias aprobadas y reprobadas, escala de 0 a 10.'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Créditos aprobados</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{resumen.creditosAprobados}</p>
              <p className="mt-1 text-xs text-gray-500">
                De {resumen.creditosInscritos} créditos inscritos.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:col-span-2 xl:col-span-1">
              <p className="text-sm text-gray-500">Materias aprobadas</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{resumen.materiasAprobadas}</p>
              <p className="mt-1 text-xs text-gray-500">
                De {resumen.totalMaterias} materias cursadas o en curso.
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-200 px-5 py-3 text-base font-semibold text-gray-900">
              Materias por estado
            </h2>
            <ul className="divide-y divide-gray-100">
              {resumen.porEstado.map(({ estado, total }) => (
                <li key={estado} className="flex items-center justify-between gap-3 px-5 py-3">
                  <EstadoBadge estado={estado} />
                  <span className="text-sm font-semibold text-gray-900">
                    {total} {total === 1 ? 'materia' : 'materias'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-200 px-5 py-3 text-base font-semibold text-gray-900">
              Por ciclo
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Ciclo</th>
                    <th className="px-5 py-3 font-medium">Materias</th>
                    <th className="px-5 py-3 font-medium">Créditos aprobados</th>
                    <th className="px-5 py-3 font-medium">Promedio</th>
                    <th className="px-5 py-3 font-medium">
                      <span className="sr-only">Detalle</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ciclos.map((c) => (
                    <tr key={c.cicloId}>
                      <td className="px-5 py-3 font-semibold text-gray-900">
                        {c.nombreCiclo}
                        {c.activo && (
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Actual
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{c.materias}</td>
                      <td className="px-5 py-3 text-gray-700">{c.creditosAprobados}</td>
                      <td className="px-5 py-3 text-gray-700">{formatCalif(c.promedio)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/alumno/historial?ciclo=${c.cicloId}`}
                          className="font-semibold text-[#1f2328] underline hover:text-[#3a4048]"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-4 text-xs text-gray-500">
            El promedio solo considera materias con resultado definitivo (aprobadas o reprobadas);
            las que siguen en curso o pendientes de extraordinario no cuentan todavía.
          </p>
        </>
      )}
    </div>
  );
}