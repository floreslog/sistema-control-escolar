import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { BTN_PRIMARIO, BTN_SECUNDARIO, CHIP, TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getMateriasCalificables } from '@/lib/docente/calificaciones/queries';
import { plural } from '@/lib/docente/utils';
import type { MateriaCalificable } from '@/lib/docente/calificaciones/types';

export default async function DocenteCalificacionesPage() {
  await requireDocente();
  const { materias, parametros } = await getMateriasCalificables();

  const porCiclo = new Map<string, MateriaCalificable[]>();
  for (const m of materias) {
    const lista = porCiclo.get(m.nombreCiclo) ?? [];
    lista.push(m);
    porCiclo.set(m.nombreCiclo, lista);
  }

  return (
    <div>
      <PageHeader
        titulo="Calificaciones"
        descripcion="Captura y edita los parciales de las materias que impartes."
      />

      {materias.length === 0 ? (
        <section className={`${TARJETA} p-6`}>
          <h2 className="text-base font-semibold text-gray-900">No impartes materias todavía</h2>
          <p className="mt-1 text-sm text-gray-600">
            Crea un grupo y agrégale materias en{' '}
            <Link href="/docente/grupos" className="font-semibold text-[#1f2328] underline">
              Mis grupos
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
                <article key={m.grupoAsignaturaId} className={`${TARJETA} flex flex-col p-5`}>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
                      {!m.cicloActivo && <span className={CHIP}>Solo consulta</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {m.clave} · Grupo {m.nombreGrupo}
                    </p>
                    <p className="mt-3 text-sm text-gray-700">
                      {plural(m.inscritos, 'alumno inscrito', 'alumnos inscritos')}
                    </p>

                    {m.inscritos > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {m.capturados.map((cap, i) => {
                          const completo = cap === m.inscritos;
                          return (
                            <li
                              key={i}
                              aria-label={`Parcial ${i + 1}: ${cap} de ${m.inscritos} capturados`}
                              className={`rounded-md border px-2.5 py-1 text-sm ${
                                completo
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : 'border-[#dcdfe3] text-gray-900'
                              }`}
                            >
                              <span className={completo ? 'text-green-700' : 'text-gray-500'}>
                                P{i + 1}
                              </span>{' '}
                              <span className="font-semibold">
                                {cap}/{m.inscritos}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-3">
                    {m.inscritos === 0 ? (
                      <Link
                        href={`/docente/grupos/${m.grupoId}/materias/${m.grupoAsignaturaId}`}
                        className={BTN_SECUNDARIO}
                      >
                        Inscribir alumnos
                      </Link>
                    ) : (
                      <Link
                        href={`/docente/calificaciones/${m.grupoAsignaturaId}`}
                        className={m.cicloActivo ? BTN_PRIMARIO : BTN_SECUNDARIO}
                      >
                        {m.cicloActivo ? 'Capturar calificaciones' : 'Ver calificaciones'}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-xs text-gray-500">
        Cada materia tiene {plural(parametros.numParciales, 'parcial', 'parciales')} y la
        calificación mínima aprobatoria es {parametros.calificacionMinima}.
      </p>
    </div>
  );
}