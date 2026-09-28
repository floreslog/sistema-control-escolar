import Link from 'next/link';
import { z } from 'zod';
import Detalle, { ListaDatos } from '@/components/Detalle';
import EstadoBadge from '@/components/EstadoBadge';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getCiclos, getMateriasDeCiclo, getParametros } from '@/lib/alumno/queries';
import {
  esEstadoDefinitivo,
  etiquetaOportunidad,
  formatCalif,
  type CicloResumen,
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
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
      </header>

      {/* Selector de ciclo */}
      <nav aria-label="Ciclos escolares" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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

      <p className="mb-4 text-sm text-gray-600">{resumenCiclo(seleccionado)}</p>

      <section aria-label={`Materias del ciclo ${seleccionado.nombreCiclo}`}>
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {materias.map((m) => (
            <FilaMateria key={m.inscripcionId} materia={m} numParciales={parametros.numParciales} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function resumenCiclo(c: CicloResumen): string {
  const partes = [
    `${c.materias} ${c.materias === 1 ? 'materia' : 'materias'}`,
    `${c.creditosAprobados} ${c.creditosAprobados === 1 ? 'crédito aprobado' : 'créditos aprobados'}`,
  ];
  if (c.promedio !== null) partes.push(`promedio ${formatCalif(c.promedio)}`);
  return partes.join(', ');
}

/** "Ordinario 5.00 → 1ra extraordinaria 7.50". Solo existe si hubo extraordinarios. */
function textoRecorrido(m: MateriaHistorial): string | null {
  if (m.extras.length === 0) return null;

  const partes = [`Ordinario ${formatCalif(m.promedio)}`];
  for (const e of m.extras) {
    partes.push(
      `${etiquetaOportunidad(e.orden)} ${e.calificacion === null ? 'pendiente' : formatCalif(e.calificacion)}`
    );
  }
  return partes.join(' → ');
}

function FilaMateria({
  materia: m,
  numParciales,
}: {
  materia: MateriaHistorial;
  numParciales: number;
}) {
  const definitiva = esEstadoDefinitivo(m.estado);
  const valor = definitiva ? m.calificacionFinal : m.promedio;
  const recorrido = textoRecorrido(m);
  const aproboEnExtra = m.estado === 'Aprobado' && m.oportunidadActual > 1;

  const datos = [
    { etiqueta: 'Clave', valor: m.clave },
    ...(m.creditos !== null ? [{ etiqueta: 'Créditos', valor: String(m.creditos) }] : []),
    { etiqueta: 'Grupo', valor: m.nombreGrupo },
    {
      etiqueta: 'Parciales del ordinario',
      valor: `${m.parcialesCapturados} de ${numParciales} capturados`,
    },
    ...(m.parcialesCapturados > 0
      ? [{ etiqueta: 'Promedio del ordinario', valor: formatCalif(m.promedio) }]
      : []),
    ...m.extras
      .filter((e) => e.fechaExamen)
      .map((e) => ({
        etiqueta: `Examen ${etiquetaOportunidad(e.orden).toLowerCase()}`,
        valor: e.fechaExamen as string,
      })),
  ];

  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
          {recorrido && <p className="mt-1 text-sm text-gray-600">{recorrido}</p>}
          {aproboEnExtra && (
            <p className="mt-0.5 text-sm font-medium text-green-700">
              Aprobó en {etiquetaOportunidad(m.oportunidadActual)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:flex-col sm:items-end sm:gap-2">
          <div className="sm:text-right">
            <p className="text-xl font-bold text-gray-900">{formatCalif(valor)}</p>
            <p className="text-xs text-gray-500">{definitiva ? 'Final' : 'Promedio parcial'}</p>
          </div>
          <EstadoBadge estado={m.estado} />
        </div>
      </div>

      <div className="mt-3">
        <Detalle>
          <ListaDatos datos={datos} />
        </Detalle>
      </div>
    </li>
  );
}