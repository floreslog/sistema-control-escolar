import PageHeader from '@/components/PageHeader';
import { TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getExtraordinarios } from '@/lib/docente/extraordinarios/queries';
import { plural } from '@/lib/docente/utils';

import {
  enviarAExtraordinarioAction,
  guardarExtraordinariosAction,
} from '@/app/docente/extraordinarios/actions';

import type { MateriaRef } from '@/lib/docente/extraordinarios/types';
import CapturaExtraForm from './CapturarExtraForm';
import EnviarForm from './EnviarForm';

function TituloMateria({ materia }: { materia: MateriaRef }) {
  return (
    <div className="mb-3">
      <h3 className="font-semibold text-gray-900">{materia.nombre}</h3>
      <p className="text-xs text-gray-500">
        {materia.clave} · Grupo {materia.nombreGrupo} · Ciclo {materia.nombreCiclo}
      </p>
    </div>
  );
}

export default async function DocenteExtraordinariosPage() {
  await requireDocente();
  const { porEnviar, captura, calificacionMinima } = await getExtraordinarios();

  const totalPorEnviar = porEnviar.reduce((s, b) => s + b.alumnos.length, 0);
  const sinCalificar = captura.reduce(
    (s, b) => s + b.alumnos.filter((a) => a.calificacion === null).length,
    0,
  );

  const descripcion =
    totalPorEnviar + sinCalificar > 0
      ? `${plural(totalPorEnviar, 'alumno por enviar', 'alumnos por enviar')} · ${plural(
          sinCalificar,
          'pendiente de calificar',
          'pendientes de calificar',
        )}`
      : 'Alumnos pendientes de extraordinario y captura de sus resultados.';

  return (
    <div>
      <PageHeader titulo="Extraordinarios" descripcion={descripcion} />

      {porEnviar.length === 0 && captura.length === 0 && (
        <section className={`${TARJETA} p-6`}>
          <h2 className="text-base font-semibold text-gray-900">Nada pendiente por ahora</h2>
          <p className="mt-1 text-sm text-gray-600">
            Aquí aparecerán los alumnos que, una vez capturados todos sus parciales, no hayan
            aprobado en ordinario. Solo se muestran ciclos activos.
          </p>
        </section>
      )}

      {porEnviar.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Por enviar a extraordinario</h2>
          <p className="mb-4 text-sm text-gray-600">
            Alumnos con todos sus parciales capturados que no han aprobado. Selecciona a quienes
            presentarán la siguiente oportunidad.
          </p>

          <div className="space-y-6">
            {porEnviar.map((b) => (
              <div key={b.materia.grupoAsignaturaId}>
                <TituloMateria materia={b.materia} />
                <EnviarForm
                  key={b.alumnos.map((a) => a.inscripcionId).join('|')}
                  alumnos={b.alumnos}
                  calificacionMinima={calificacionMinima}
                  accion={enviarAExtraordinarioAction.bind(null, b.materia.grupoAsignaturaId)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {captura.length > 0 && (
        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Captura de extraordinarios</h2>
          <p className="mb-4 text-sm text-gray-600">
            Registra la calificación y la fecha de examen de la oportunidad vigente de cada alumno.
            Puedes corregirla mientras no lo envíes a una oportunidad posterior.
          </p>

          <div className="space-y-6">
            {captura.map((b) => (
              <div key={b.materia.grupoAsignaturaId}>
                <TituloMateria materia={b.materia} />
                <CapturaExtraForm
                  key={b.alumnos
                    .map((a) => `${a.extraordinarioId}:${a.calificacion ?? ''}:${a.fechaExamen}`)
                    .join('|')}
                  grupoAsignaturaId={b.materia.grupoAsignaturaId}
                  alumnos={b.alumnos}
                  calificacionMinima={calificacionMinima}
                  accion={guardarExtraordinariosAction.bind(null, b.materia.grupoAsignaturaId)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}