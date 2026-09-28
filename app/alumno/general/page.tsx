import Link from 'next/link';
import Detalle from '@/components/Detalle';
import PageHeader from '@/components/Pageheader';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getCiclos, getResumen } from '@/lib/alumno/queries';
import { formatCalif } from '@/lib/alumno/types';

export default async function AlumnoGeneralPage() {
  await requireAlumno();

  const [resumen, ciclos] = await Promise.all([getResumen(), getCiclos()]);

  const porcentaje =
    resumen.creditosInscritos > 0
      ? Math.min(100, Math.round((resumen.creditosAprobados / resumen.creditosInscritos) * 100))
      : 0;

  return (
    <div>
      <PageHeader titulo="Resumen general" descripcion="Tu avance acumulado en la carrera." />

      {resumen.totalMaterias === 0 ? (
        <section className="rounded-xl border border-[#dcdfe3] bg-white p-6">
          <p className="text-sm text-gray-600">
            Aún no tienes materias registradas, por eso no hay resumen que mostrar.
          </p>
        </section>
      ) : (
        <>
          {/* Las dos cifras que importan */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#dcdfe3] bg-white p-6">
              <p className="text-sm text-gray-500">Promedio general</p>
              <p className="mt-1 text-4xl font-bold text-gray-900">
                {formatCalif(resumen.promedioGeneral)}
              </p>
              {resumen.promedioGeneral === null && (
                <p className="mt-2 text-sm text-gray-500">
                  Aparecerá cuando tengas una materia con resultado final.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[#dcdfe3] bg-white p-6">
              <p className="text-sm text-gray-500">Créditos aprobados</p>
              <p className="mt-1 text-4xl font-bold text-gray-900">{resumen.creditosAprobados}</p>
              <div
                role="progressbar"
                aria-label="Créditos aprobados sobre créditos inscritos"
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
              >
                <div className="h-full rounded-full bg-[#1f2328]" style={{ width: `${porcentaje}%` }} />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                de {resumen.creditosInscritos} créditos inscritos
              </p>
            </div>
          </section>

          {/* Ciclos: cada fila lleva a su detalle en el historial */}
          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Tus ciclos</h2>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-[#dcdfe3] bg-white">
              {ciclos.map((c) => (
                <li key={c.cicloId}>
                  <Link
                    href={`/alumno/historial?ciclo=${c.cicloId}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1f2328]/40"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {c.nombreCiclo}
                        {c.activo && (
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Actual
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.materias} {c.materias === 1 ? 'materia' : 'materias'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCalif(c.promedio)}</p>
                        <p className="text-xs text-gray-500">promedio</p>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-6">
            <Detalle titulo="¿Cómo se calcula el promedio?">
              <p className="max-w-prose text-sm text-gray-600">
                Es el promedio de las calificaciones finales de tus materias con resultado
                definitivo, es decir, aprobadas o reprobadas. Las que siguen en curso o pendientes
                de extraordinario no cuentan todavía. La escala va de 0 a 10.
              </p>
            </Detalle>
          </div>
        </>
      )}
    </div>
  );
}