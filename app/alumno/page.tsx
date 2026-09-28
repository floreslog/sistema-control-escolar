import Link from 'next/link';
import Detalle, { ListaDatos } from '@/components/Detalle';
import EstadoBadge from '@/components/EstadoBadge';
import PageHeader from '@/components/PageHeader';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getMateriasActuales, getParametros } from '@/lib/alumno/queries';
import {
  etiquetaOportunidad,
  formatCalif,
  type Estado,
  type MateriaActual,
} from '@/lib/alumno/types';

const PRIORIDAD: Record<Estado, number> = {
  Reprobado: 0,
  'Pendiente de extraordinario': 1,
  'Pendiente siguiente extraordinario': 1,
  'En extraordinario': 1,
  'En curso': 2,
  Aprobado: 3,
};

function prioridad(m: MateriaActual): number {
  return PRIORIDAD[m.estado] ?? 4;
}

function resumenTexto(materias: MateriaActual[]): string {
  const cuenta = (estado: Estado) => materias.filter((m) => m.estado === estado).length;
  const aprobadas = cuenta('Aprobado');
  const reprobadas = cuenta('Reprobado');
  const enCurso = cuenta('En curso');
  const pendientes = materias.length - aprobadas - reprobadas - enCurso;

  const partes: string[] = [];
  if (aprobadas) partes.push(`${aprobadas} ${aprobadas === 1 ? 'aprobada' : 'aprobadas'}`);
  if (enCurso) partes.push(`${enCurso} en curso`);
  if (pendientes)
    partes.push(`${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'} de extraordinario`);
  if (reprobadas) partes.push(`${reprobadas} ${reprobadas === 1 ? 'reprobada' : 'reprobadas'}`);

  return `${materias.length} ${materias.length === 1 ? 'materia' : 'materias'}: ${partes.join(', ')}`;
}

export default async function AlumnoActualPage() {
  await requireAlumno();

  const [parametros, materias] = await Promise.all([getParametros(), getMateriasActuales()]);

  // Agrupa por ciclo (normalmente solo hay uno activo) y ordena cada grupo
  // por prioridad; el orden alfabético original se conserva dentro de cada nivel.
  const porCiclo = new Map<string, MateriaActual[]>();
  for (const m of materias) {
    const lista = porCiclo.get(m.nombreCiclo) ?? [];
    lista.push(m);
    porCiclo.set(m.nombreCiclo, lista);
  }
  for (const lista of porCiclo.values()) {
    lista.sort((a, b) => prioridad(a) - prioridad(b));
  }

  const requierenAtencion = materias.filter((m) => prioridad(m) <= 1);
  const hayReprobada = requierenAtencion.some((m) => m.estado === 'Reprobado');

  return (
    <div>
      <PageHeader
        titulo="Ciclo actual"
        descripcion={materias.length > 0 ? resumenTexto(materias) : undefined}
      />

      {materias.length === 0 ? (
        <section className="rounded-xl border border-[#dcdfe3] bg-white p-6">
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
        <>
          {requierenAtencion.length > 0 && (
            <section
              className={`mb-6 rounded-xl border p-4 ${
                hayReprobada ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <h2
                className={`text-sm font-semibold ${
                  hayReprobada ? 'text-red-800' : 'text-amber-900'
                }`}
              >
                Requiere tu atención
              </h2>
              <ul className="mt-1 space-y-0.5 text-sm text-gray-800">
                {requierenAtencion.map((m) => (
                  <li key={m.inscripcionId}>
                    {m.nombre}: {m.estado.toLowerCase()}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {Array.from(porCiclo.entries()).map(([nombreCiclo, lista]) => (
            <section key={nombreCiclo} className="mb-8">
              {porCiclo.size > 1 && (
                <h2 className="mb-3 text-base font-semibold text-gray-900">Ciclo {nombreCiclo}</h2>
              )}
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
          ))}
        </>
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
  // El número grande es la calificación final si ya es definitiva;
  // si no, el promedio de los parciales capturados hasta ahora.
  const definitiva = m.calificacionFinal !== null;
  const valor = definitiva ? m.calificacionFinal : m.promedio;
  const etiquetaValor = definitiva
    ? 'Calificación final'
    : valor === null
      ? 'Sin parciales aún'
      : 'Promedio parcial';

  const datos = [
    { etiqueta: 'Clave', valor: m.clave },
    ...(m.creditos !== null ? [{ etiqueta: 'Créditos', valor: String(m.creditos) }] : []),
    { etiqueta: 'Grupo', valor: m.nombreGrupo },
    {
      etiqueta: 'Parciales capturados',
      valor: `${m.parcialesCapturados} de ${numParciales}`,
    },
    { etiqueta: 'Oportunidad actual', valor: m.nombreOportunidad },
  ];

  return (
    <article className="flex flex-col rounded-xl border border-[#dcdfe3] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
          <EstadoBadge estado={m.estado} />
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-3xl font-bold ${
              valor !== null && valor < calificacionMinima ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {formatCalif(valor)}
          </p>
          <p className="text-xs text-gray-500">{etiquetaValor}</p>
        </div>
      </div>

      {/* Parciales en una fila compacta; los no capturados son "pendiente", no 0 */}
      <ul className="mt-4 flex flex-wrap gap-2">
        {m.parciales.map((cal, i) => (
          <li
            key={i}
            aria-label={`Parcial ${i + 1}`}
            className={`rounded-md border px-2.5 py-1 text-sm ${
              cal === null
                ? 'border-dashed border-gray-300 text-gray-400'
                : 'border-[#dcdfe3] text-gray-900'
            }`}
          >
            <span className="text-gray-500">P{i + 1}</span>{' '}
            {cal === null ? (
              'pendiente'
            ) : (
              <span
                className={`font-semibold ${cal < calificacionMinima ? 'text-red-600' : ''}`}
              >
                {formatCalif(cal)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* La oportunidad solo se destaca cuando ya no es el ordinario */}
      {m.oportunidadActual > 1 && (
        <p className="mt-3 text-xs text-gray-600">
          {m.estado === 'Aprobado'
            ? `Aprobada en ${etiquetaOportunidad(m.oportunidadActual)}`
            : `Oportunidad actual: ${etiquetaOportunidad(m.oportunidadActual)}`}
        </p>
      )}

      <div className="mt-4 border-t border-gray-100 pt-3">
        <Detalle>
          <ListaDatos datos={datos} />
        </Detalle>
      </div>
    </article>
  );
}