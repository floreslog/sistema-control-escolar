import Link from 'next/link';
import BarraEstados, { segmentosEstado } from '@/components/BarraEstados';
import PageHeader from '@/components/PageHeader';
import { FOCO, TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getResumenInicio } from '@/lib/docente/inicio/queries';
import { formatearCalif } from '@/lib/docente/calificaciones/utils';
import { plural } from '@/lib/docente/utils';
import type { MateriaResumen } from '@/lib/docente/inicio/types';

function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  if (parte === total) return 100;
  if (parte === 0) return 0;
  return Math.min(99, Math.max(1, Math.round((parte / total) * 100)));
}

function Kpi({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className={`${TARJETA} p-5`}>
      <p className="text-xs font-medium text-[#666c73]">{etiqueta}</p>
      <p className="mt-1 text-3xl font-bold tracking-[-0.02em] text-[#1a1d21]">{valor}</p>
      {nota && <p className="mt-1 text-xs text-gray-500">{nota}</p>}
    </div>
  );
}

export default async function DocenteInicioPage() {
  await requireDocente();
  const r = await getResumenInicio();
  const { materias } = r;

  const suma = (f: (m: MateriaResumen) => number) => materias.reduce((s, m) => s + f(m), 0);
  const aprobados = suma((m) => m.aprobados);
  const enCurso = suma((m) => m.enCurso);
  const porEnviar = suma((m) => m.porEnviar);
  const enExtra = suma((m) => m.enExtra);
  const reprobados = suma((m) => m.reprobados);

  // Aprobación solo sobre materias ya concluidas (aprobadas o reprobadas definitivas).
  const concluidas = aprobados + reprobados;
  const pctAprobacion = concluidas > 0 ? porcentaje(aprobados, concluidas) : null;

  const alertas: { texto: string; href: string }[] = [];
  if (porEnviar > 0) {
    alertas.push({
      texto: `${plural(porEnviar, 'alumno', 'alumnos')} por enviar a extraordinario`,
      href: '/docente/extraordinarios',
    });
  }
  if (enExtra > 0) {
    alertas.push({
      texto: `${plural(enExtra, 'extraordinario', 'extraordinarios')} sin calificación capturada`,
      href: '/docente/extraordinarios',
    });
  }
  for (const m of materias) {
    if (m.inscritos === 0) {
      alertas.push({
        texto: `${m.nombre} (grupo ${m.nombreGrupo}) no tiene alumnos inscritos`,
        href: `/docente/grupos/${m.grupoId}/materias/${m.grupoAsignaturaId}`,
      });
    }
  }

  const descripcion =
    materias.length > 0
      ? `Ciclo ${r.ciclos.join(', ')} · ${plural(materias.length, 'materia', 'materias')} a tu cargo`
      : 'Resumen de tus grupos, captura pendiente y extraordinarios.';

  return (
    <div>
      <PageHeader titulo="Inicio" descripcion={descripcion} />

      {materias.length === 0 ? (
        <section className={`${TARJETA} p-6`}>
          <h2 className="text-base font-semibold text-gray-900">Aún no impartes materias</h2>
          <p className="mt-1 text-sm text-gray-600">
            Cuando tengas materias en un ciclo activo verás aquí tu resumen. Empieza en{' '}
            <Link href="/docente/grupos" className="font-semibold text-[#1f2328] underline">
              Mis grupos
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          {alertas.length > 0 && (
            <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-semibold text-amber-900">Requiere tu atención</h2>
              <ul className="mt-2 space-y-1">
                {alertas.map((a) => (
                  <li key={a.href + a.texto}>
                    <Link
                      href={a.href}
                      className={`rounded text-sm text-gray-800 underline-offset-2 hover:underline ${FOCO}`}
                    >
                      {a.texto} →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Indicadores */}
          <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Kpi etiqueta="Grupos activos" valor={String(r.grupos)} />
            <Kpi etiqueta="Alumnos" valor={String(r.alumnos)} nota="Distintos, en tus materias" />
            <Kpi
              etiqueta="Promedio de parciales"
              valor={r.promedio === null ? '—' : formatearCalif(r.promedio)}
              nota={r.promedio === null ? 'Aún sin calificaciones' : `Mínima aprobatoria: ${r.calificacionMinima}`}
            />
            <Kpi
              etiqueta="Aprobación"
              valor={pctAprobacion === null ? '—' : `${pctAprobacion}%`}
              nota={
                pctAprobacion === null
                  ? 'Aún no hay materias concluidas'
                  : `${aprobados} aprobadas · ${reprobados} reprobadas`
              }
            />
          </div>

          {/* Distribución general */}
          <section className={`${TARJETA} mb-8 p-5`}>
            <h2 className="text-base font-semibold text-gray-900">Situación de tus alumnos</h2>
            <p className="mb-4 mt-1 text-sm text-gray-600">
              {plural(suma((m) => m.inscritos), 'inscripción', 'inscripciones')} en el ciclo activo, por estado.
            </p>
            <BarraEstados
              alto="h-4"
              leyenda
              segmentos={segmentosEstado({
                aprobados,
                enCurso,
                enExtra: porEnviar + enExtra,
                reprobados,
              })}
            />
          </section>

          {/* Por materia */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">Por materia</h2>
            <div className={`${TARJETA} overflow-x-auto`}>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
                  <tr>
                    <th className="px-4 py-3">Materia</th>
                    <th className="px-3 py-3 text-center">Inscritos</th>
                    <th className="px-3 py-3 text-center">Promedio</th>
                    <th className="min-w-[200px] px-4 py-3">Situación</th>
                    <th className="min-w-[140px] px-4 py-3">Captura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materias.map((m) => {
                    const pct = porcentaje(m.capturados, m.esperados);
                    return (
                      <tr key={m.grupoAsignaturaId}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/docente/calificaciones/${m.grupoAsignaturaId}`}
                            className={`rounded font-medium text-gray-900 underline-offset-2 hover:underline ${FOCO}`}
                          >
                            {m.nombre}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {m.clave} · Grupo {m.nombreGrupo}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-700">{m.inscritos}</td>
                        <td className="px-3 py-3 text-center">
                          {m.promedio === null ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <span
                              className={`font-semibold ${
                                m.promedio < r.calificacionMinima ? 'text-red-600' : 'text-gray-900'
                              }`}
                            >
                              {formatearCalif(m.promedio)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.inscritos === 0 ? (
                            <span className="text-gray-400">Sin alumnos</span>
                          ) : (
                            <BarraEstados
                              segmentos={segmentosEstado({
                                aprobados: m.aprobados,
                                enCurso: m.enCurso,
                                enExtra: m.porEnviar + m.enExtra,
                                reprobados: m.reprobados,
                              })}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.esperados === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div
                                role="img"
                                aria-label={`${m.capturados} de ${m.esperados} calificaciones capturadas`}
                                className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e9eaec]"
                              >
                                <div className="h-full bg-[#1f2328]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-600">{pct}%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden="true" /> Aprobados
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" /> En curso
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> Extraordinario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" /> Reprobados
              </span>
            </p>
          </section>
        </>
      )}
    </div>
  );
}