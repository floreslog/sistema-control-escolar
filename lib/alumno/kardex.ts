import pool from '@/lib/db';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import { getCiclos, getMateriasDeCiclo } from '@/lib/alumno/queries';
import { esEstadoDefinitivo, type MateriaHistorial } from '@/lib/alumno/types';

export interface FiltrosKardex {
  ciclos: 'todo' | number[];
  soloAprobadas: boolean;
}

export interface AlumnoKardex {
  nombreCompleto: string;
  matricula: string;
  correo: string | null;
  fechaNacimiento: string | null;
}

export interface CicloKardex {
  cicloId: number;
  nombreCiclo: string;
  activo: boolean;
  materias: MateriaHistorial[];
  promedio: number | null;
  creditosAprobados: number;
}

export interface ResumenKardex {
  materias: number;
  aprobadas: number;
  reprobadas: number;
  enProceso: number;
  creditosAprobados: number;
  creditosTotales: number;
  promedioGeneral: number | null;
}

export interface DatosKardex {
  alumno: AlumnoKardex;
  periodoTexto: string;
  materiasTexto: string;
  ciclos: CicloKardex[];
  resumen: ResumenKardex;
}

function promedioDefinitivas(materias: MateriaHistorial[]): number | null {
  const notas = materias
    .filter((m) => esEstadoDefinitivo(m.estado) && m.calificacionFinal !== null)
    .map((m) => m.calificacionFinal as number);

  if (notas.length === 0) return null;
  const promedio = notas.reduce((suma, n) => suma + n, 0) / notas.length;
  return Math.round(promedio * 100) / 100;
}

function sumaCreditos(materias: MateriaHistorial[]): number {
  return materias.reduce((suma, m) => suma + (m.creditos ?? 0), 0);
}

async function getAlumnoKardex(alumnoId: number): Promise<AlumnoKardex | null> {
  const { rows } = await pool.query<{
    nombreCompleto: string;
    matricula: string;
    correo: string | null;
    fechaNacimiento: string | null;
  }>(
    `SELECT a.Nombre || ' ' || a.ApellidoPaterno
              || COALESCE(' ' || a.ApellidoMaterno, '') AS "nombreCompleto",
            a.Matricula                                 AS "matricula",
            a.Correo                                    AS "correo",
            TO_CHAR(a.FechaNacimiento, 'DD/MM/YYYY')    AS "fechaNacimiento"
     FROM Alumno a
     WHERE a.AlumnoID = $1 AND a.Activo = TRUE`,
    [alumnoId],
  );

  return rows[0] ?? null;
}

function textoPeriodo(
  filtros: FiltrosKardex,
  elegidos: { nombreCiclo: string }[],
): string {
  if (filtros.ciclos === 'todo') return 'Historial completo';

  const nombres = elegidos.map((c) => c.nombreCiclo);
  if (nombres.length === 0) return 'Sin ciclos';
  if (nombres.length <= 4) {
    return `${nombres.length === 1 ? 'Ciclo' : 'Ciclos'} ${nombres.join(', ')}`;
  }
  return `${nombres.length} ciclos (${nombres[0]} a ${nombres[nombres.length - 1]})`;
}

// Regresa null si el alumno no existe o está inactivo.
// `ciclos` queda vacío si ninguna materia coincide con los filtros.

export async function obtenerDatosKardex(
  filtros: FiltrosKardex,
): Promise<DatosKardex | null> {
  const session = await requireAlumno();

  const alumno = await getAlumnoKardex(session.id);
  if (!alumno) return null;

  const propios = await getCiclos();
  const elegidos = (
    filtros.ciclos === 'todo'
      ? propios
      : propios.filter((c) => (filtros.ciclos as number[]).includes(c.cicloId))
  )
    .slice()
    .reverse();

  const porCiclo = await Promise.all(
    elegidos.map(async (c): Promise<CicloKardex> => {
      const todas = await getMateriasDeCiclo(c.cicloId);
      const materias = filtros.soloAprobadas
        ? todas.filter((m) => m.estado === 'Aprobado')
        : todas;

      return {
        cicloId: c.cicloId,
        nombreCiclo: c.nombreCiclo,
        activo: c.activo,
        materias,
        promedio: promedioDefinitivas(materias),
        creditosAprobados: sumaCreditos(
          materias.filter((m) => m.estado === 'Aprobado'),
        ),
      };
    }),
  );

  const ciclos = porCiclo.filter((c) => c.materias.length > 0);
  const todasLasMaterias = ciclos.flatMap((c) => c.materias);

  const resumen: ResumenKardex = {
    materias: todasLasMaterias.length,
    aprobadas: todasLasMaterias.filter((m) => m.estado === 'Aprobado').length,
    reprobadas: todasLasMaterias.filter((m) => m.estado === 'Reprobado').length,
    enProceso: todasLasMaterias.filter((m) => !esEstadoDefinitivo(m.estado))
      .length,
    creditosAprobados: sumaCreditos(
      todasLasMaterias.filter((m) => m.estado === 'Aprobado'),
    ),
    creditosTotales: sumaCreditos(todasLasMaterias),
    promedioGeneral: promedioDefinitivas(todasLasMaterias),
  };

  return {
    alumno,
    periodoTexto: textoPeriodo(filtros, elegidos),
    materiasTexto: filtros.soloAprobadas
      ? 'Solo materias aprobadas'
      : 'Todas las materias',
    ciclos,
    resumen,
  };
}
