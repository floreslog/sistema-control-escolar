import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import BotonAccion from '@/components/BotonAccion';
import { BTN_PRIMARIO, BTN_SECUNDARIO, CHIP, TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getAsignaturasDisponibles, getGrupoDetalle } from '@/lib/docente/queries';
import { parseId, plural } from '@/lib/docente/utils';
import { quitarAlumnoAction, quitarMateriaAction } from '@/app/docente/grupos/actions';
import AgregarMateriaForm from './AgregarMateriaForm';
import { agregarMateriaAction } from '@/app/docente/grupos/actions';

export default async function GrupoDetallePage({
  params,
}: {
  params: Promise<{ grupoId: string }>;
}) {
  await requireDocente();

  const { grupoId: grupoIdRaw } = await params;
  const grupoId = parseId(grupoIdRaw);
  if (!grupoId) notFound();

  const grupo = await getGrupoDetalle(grupoId);
  if (!grupo) notFound();

  const asignaturas = grupo.esDueno ? await getAsignaturasDisponibles(grupoId) : [];
  const claves = new Map(grupo.materias.map((m) => [m.grupoAsignaturaId, m.clave]));

  const descripcion = [
    `Ciclo ${grupo.nombreCiclo}`,
    grupo.semestre ? `Semestre ${grupo.semestre}` : null,
    grupo.turno,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <Link href="/docente/grupos" className="text-sm font-medium text-[#666c73] hover:text-[#1a1d21]">
        ← Mis grupos
      </Link>

      <PageHeader titulo={`Grupo ${grupo.nombreGrupo}`} descripcion={descripcion} />

      {/* Materias */}
      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Materias del grupo</h2>

        {grupo.materias.length === 0 ? (
          <p className={`${TARJETA} p-5 text-sm text-gray-600`}>
            Este grupo aún no tiene materias.
            {grupo.esDueno && ' Agrega la primera con el formulario de abajo.'}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {grupo.materias.map((m) => (
              <article key={m.grupoAsignaturaId} className={`${TARJETA} flex flex-col p-5`}>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {m.clave}
                    {m.creditos !== null ? ` · ${plural(m.creditos, 'crédito', 'créditos')}` : ''}
                  </p>
                  <p className="mt-3 text-sm text-gray-700">
                    {plural(m.inscritos, 'alumno inscrito', 'alumnos inscritos')} de{' '}
                    {grupo.alumnos.length}
                  </p>
                </div>

                <div className="mt-4 flex items-start justify-between gap-2 border-t border-gray-100 pt-3">
                  {m.puedoGestionar ? (
                    <Link
                      href={`/docente/grupos/${grupo.grupoId}/materias/${m.grupoAsignaturaId}`}
                      className={BTN_SECUNDARIO}
                    >
                      Inscripciones
                    </Link>
                  ) : (
                    <span className={CHIP}>La imparte otro docente</span>
                  )}

                  {grupo.esDueno && m.inscritos === 0 && (
                    <BotonAccion
                      accion={quitarMateriaAction.bind(null, grupo.grupoId, m.grupoAsignaturaId)}
                      etiqueta="Quitar"
                      enCurso="Quitando…"
                      confirmar={`¿Quitar ${m.nombre} del grupo?`}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {grupo.esDueno && (
          <AgregarMateriaForm
            asignaturas={asignaturas}
            accion={agregarMateriaAction.bind(null, grupo.grupoId)}
          />
        )}
      </section>

      {/* Alumnos */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            Alumnos del grupo{' '}
            <span className="font-normal text-gray-500">({grupo.alumnos.length})</span>
          </h2>
          {grupo.esDueno && (
            <Link href={`/docente/grupos/${grupo.grupoId}/alumnos`} className={BTN_PRIMARIO}>
              Agregar alumnos
            </Link>
          )}
        </div>

        {grupo.alumnos.length === 0 ? (
          <p className={`${TARJETA} p-5 text-sm text-gray-600`}>
            Aún no hay alumnos en este grupo.
          </p>
        ) : (
          <div className={`${TARJETA} overflow-x-auto`}>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
                <tr>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Materias inscritas</th>
                  {grupo.esDueno && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grupo.alumnos.map((a) => (
                  <tr key={a.alumnoId}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{a.matricula}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.nombreCompleto}</td>
                    <td className="px-4 py-3">
                      {a.materias.length === 0 ? (
                        <span className="text-gray-400">Ninguna</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {a.materias.map((gaId) => (
                            <span key={gaId} className={CHIP}>
                              {claves.get(gaId) ?? '—'}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    {grupo.esDueno && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {a.materias.length === 0 ? (
                            <BotonAccion
                              accion={quitarAlumnoAction.bind(null, grupo.grupoId, a.alumnoId)}
                              etiqueta="Quitar"
                              enCurso="Quitando…"
                              confirmar={`¿Quitar a ${a.nombreCompleto} del grupo?`}
                            />
                          ) : (
                            <span className="text-xs text-gray-400">Inscrito en materias</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}