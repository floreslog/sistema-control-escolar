import Link from 'next/link';
import { z } from 'zod';
import EstadoBadge from '@/components/EstadoBadge';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import {
  getCiclos,
  getMateriasDeCiclo,
  getParametros,
} from '@/lib/alumno/queries';
import {
  esEstadoDefinitivo,
  etiquetaOportunidad,
  formatCalif,
  type MateriaHistorial,
} from '@/lib/alumno/types';

const cicloParamSchema = z.coerce.number().int().positive();

export default async function AlumnoHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  await requireAlumno();

  const [ciclos, parametros, sp] = await Promise.all([getCiclos(), getParametros(), searchParams]);

  if (ciclos.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">Aún no tienes materias registradas en tu historial.</p>
        </section>
      </div>
    );
  }

  // ?ciclo=ID solo sirve para ELEGIR entre los ciclos del propio alumno:
  // se valida y se busca dentro de su lista; si no coincide, se usa el más reciente.
  const crudo = Array.isArray(sp.ciclo) ? sp.ciclo[0] : sp.ciclo;
  const parseado = cicloParamSchema.safeParse(crudo);
  const seleccionado =
    (parseado.success ? ciclos.find((c) => c.cicloId === parseado.data) : undefined) ?? ciclos[0];

  const materias = await getMateriasDeCiclo(seleccionado.cicloId);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
        <p className="mt-1 text-sm text-gray-500">Kardex por ciclo escolar.</p>
      </header>

      {/* Selector de ciclo */}
      <nav aria-label="Ciclos escolares" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {ciclos.map((c) => {
            const activo = c.cicloId === seleccionado.cicloId;
            return (
              <li key={c.cicloId} className="shrink-0">
                <Link
                  href={`/alumno/historial?ciclo=${c.cicloId}`}
                  aria-current={activo ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    activo
                      ? 'border-[#1f2328] bg-[#1f2328] text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {c.nombreCiclo}
                  {c.activo && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        activo ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Actual
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Estadísticas del ciclo */}
      <section className="mb-4 grid grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div>
          <p className="text-xs text-gray-500">Materias</p>
          <p className="text-lg font-semibold text-gray-900">{seleccionado.materias}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Créditos aprobados</p>
          <p className="text-lg font-semibold text-gray-900">{seleccionado.creditosAprobados}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Promedio del ciclo</p>
          <p className="text-lg font-semibold text-gray-900">{formatCalif(seleccionado.promedio)}</p>
        </div>
      </section>

      {/* Materias del ciclo */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 px-4 py-3 text-base font-semibold text-gray-900 sm:px-5">
          Ciclo {seleccionado.nombreCiclo}
        </h2>
        <ul className="divide-y divide-gray-100">
          {materias.map((m) => (
            <FilaMateria
              key={m.inscripcionId}
              materia={m}
              numParciales={parametros.numParciales}
              calificacionMinima={parametros.calificacionMinima}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

type Intento = {
  clave: string;
  etiqueta: string;
  calificacion: number | null;
  nota: string | null;
  aprobo: boolean;
};

/** Arma el recorrido: ordinario y, si los hay, cada extraordinario. */
function construirIntentos(m: MateriaHistorial, numParciales: number): Intento[] {
  const aprobada = m.estado === 'Aprobado';
  const intentos: Intento[] = [];

  if (m.parcialesCapturados > 0 || m.extras.length === 0) {
    intentos.push({
      clave: 'ordinario',
      etiqueta: 'Ordinario',
      calificacion: m.promedio,
      nota:
        m.parcialesCapturados < numParciales
          ? `${m.parcialesCapturados} de ${numParciales} parciales`
          : null,
      aprobo: aprobada && m.oportunidadActual === 1,
    });
  }

  for (const e of m.extras) {
    intentos.push({
      clave: `extra-${e.orden}`,
      etiqueta: etiquetaOportunidad(e.orden),
      calificacion: e.calificacion,
      nota: e.fechaExamen ? `Examen ${e.fechaExamen}` : null,
      aprobo: aprobada && m.oportunidadActual === e.orden,
    });
  }

  return intentos;
}

function FilaMateria({
  materia: m,
  numParciales,
  calificacionMinima,
}: {
  materia: MateriaHistorial;
  numParciales: number;
  calificacionMinima: number;
}) {
  const intentos = construirIntentos(m, numParciales);

  return (
    <li className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
      <div className="min-w-0 lg:w-1/3">
        <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          {m.clave}
          {m.creditos !== null && `, ${m.creditos} créditos`}
        </p>
        <p className="text-xs text-gray-500">Grupo {m.nombreGrupo}</p>
      </div>

      <ul className="flex flex-wrap gap-2 lg:flex-1">
        {intentos.map((i) => {
          const pendiente = i.calificacion === null;
          const reprobo = !pendiente && !i.aprobo && (i.calificacion as number) < calificacionMinima;
          return (
            <li
              key={i.clave}
              className={`min-w-[7.5rem] rounded-lg border px-3 py-2 ${
                i.aprobo
                  ? 'border-green-200 bg-green-50'
                  : pendiente
                    ? 'border-dashed border-gray-300 bg-gray-50'
                    : 'border-gray-200 bg-white'
              }`}
            >
              <p className={`text-xs ${i.aprobo ? 'text-green-700' : 'text-gray-500'}`}>
                {i.etiqueta}
              </p>
              <p
                className={`text-sm font-semibold ${
                  i.aprobo ? 'text-green-700' : pendiente ? 'text-gray-400' : reprobo ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {pendiente ? 'Pendiente' : formatCalif(i.calificacion)}
              </p>
              {i.aprobo && <p className="text-xs font-medium text-green-700">Oportunidad aprobada</p>}
              {i.nota && <p className="text-xs text-gray-500">{i.nota}</p>}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3 lg:w-56 lg:justify-end">
        {esEstadoDefinitivo(m.estado) && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Final</p>
            <p className="text-base font-semibold text-gray-900">{formatCalif(m.calificacionFinal)}</p>
          </div>
        )}
        <EstadoBadge estado={m.estado} />
      </div>
    </li>
  );
}