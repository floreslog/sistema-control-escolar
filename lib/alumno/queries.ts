import { cache } from 'react';
import pool from '@/lib/db';
import { requireAlumno } from '@/lib/alumno/requireAlumno';
import {
  ESTADOS,
  esEstadoDefinitivo,
  type CicloResumen,
  type Estado,
  type Extraordinario,
  type MateriaActual,
  type MateriaBase,
  type MateriaHistorial,
  type Parametros,
  type Perfil,
  type Resumen,
} from '@/lib/alumno/types';

async function idAlumnoDeSesion(): Promise<number> {
  const session = await requireAlumno();
  return session.id;
}

function num(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const n = typeof valor === 'number' ? valor : parseFloat(valor);
  return Number.isNaN(n) ? null : n;
}

function numOrZero(valor: string | number | null | undefined): number {
  return num(valor) ?? 0;
}

/* ------------------------------------------------------------------ */
/* Perfil y parámetros                                                 */
/* ------------------------------------------------------------------ */

export const getPerfil = cache(async (): Promise<Perfil | null> => {
  const alumnoId = await idAlumnoDeSesion();

  const { rows } = await pool.query<{
    alumnoId: number;
    matricula: string;
    nombreCompleto: string;
  }>(
    `SELECT a.AlumnoID  AS "alumnoId",
            a.Matricula AS "matricula",
            a.Nombre || ' ' || a.ApellidoPaterno
              || COALESCE(' ' || a.ApellidoMaterno, '') AS "nombreCompleto"
     FROM Alumno a
     WHERE a.AlumnoID = $1 AND a.Activo = TRUE`,
    [alumnoId]
  );

  return rows[0] ?? null;
});

export const getParametros = cache(async (): Promise<Parametros> => {
  await idAlumnoDeSesion();

  const { rows } = await pool.query<{
    calificacionMinima: string;
    numParciales: number;
  }>(
    `SELECT CalificacionMinima AS "calificacionMinima",
            NumParciales       AS "numParciales"
     FROM Parametro
     WHERE ParametroID = 1`
  );

  return {
    calificacionMinima: num(rows[0]?.calificacionMinima) ?? 6,
    numParciales: rows[0]?.numParciales ?? 3,
  };
});

/* ------------------------------------------------------------------ */
/* Materias (base común para "Actual" e "Historial")                   */
/* ------------------------------------------------------------------ */

type FilaMateria = {
  inscripcionId: number;
  cicloId: number;
  nombreCiclo: string;
  nombreGrupo: string;
  clave: string;
  nombre: string;
  creditos: number | null;
  parcialesCapturados: string; // COUNT(*) -> bigint -> string
  promedio: string | null;
  oportunidadActual: number;
  nombreOportunidad: string;
  calificacionFinal: string | null;
  estado: string;
};

// Fragmento fijo (sin datos de usuario). Cada query le agrega su WHERE
// con parámetros posicionales.
const SELECT_MATERIAS = `
  SELECT r.InscripcionID        AS "inscripcionId",
         ci.CicloID             AS "cicloId",
         ci.NombreCiclo         AS "nombreCiclo",
         g.NombreGrupo          AS "nombreGrupo",
         s.Clave                AS "clave",
         s.NombreAsignatura     AS "nombre",
         s.Creditos             AS "creditos",
         r.ParcialesCapturados  AS "parcialesCapturados",
         r.Promedio             AS "promedio",
         r.OportunidadActual    AS "oportunidadActual",
         o.NombreOportunidad    AS "nombreOportunidad",
         r.CalificacionFinal    AS "calificacionFinal",
         r.Estado               AS "estado"
  FROM vw_ResultadoAsignatura r
  JOIN Asignatura   s  ON s.AsignaturaID = r.AsignaturaID
  JOIN Grupo        g  ON g.GrupoID      = r.GrupoID
  JOIN CicloEscolar ci ON ci.CicloID     = r.CicloID
  JOIN Oportunidad  o  ON o.Orden        = r.OportunidadActual
`;

const ORDEN_MATERIAS = `
  ORDER BY ci.FechaInicio DESC NULLS LAST, ci.NombreCiclo DESC, s.NombreAsignatura
`;

function mapearMateria(fila: FilaMateria): MateriaBase {
  const estado = fila.estado as Estado;
  return {
    inscripcionId: fila.inscripcionId,
    cicloId: fila.cicloId,
    nombreCiclo: fila.nombreCiclo,
    nombreGrupo: fila.nombreGrupo,
    clave: fila.clave,
    nombre: fila.nombre,
    creditos: fila.creditos,
    parcialesCapturados: numOrZero(fila.parcialesCapturados),
    promedio: num(fila.promedio),
    oportunidadActual: fila.oportunidadActual,
    nombreOportunidad: fila.nombreOportunidad,
    // La vista regresa un valor "provisional" mientras la materia está viva;
    // solo lo exponemos como calificación final cuando ya es definitivo.
    calificacionFinal: esEstadoDefinitivo(estado) ? num(fila.calificacionFinal) : null,
    estado,
  };
}

/* ------------------------------------------------------------------ */
/* Ciclo actual                                                        */
/* ------------------------------------------------------------------ */

export const getMateriasActuales = cache(async (): Promise<MateriaActual[]> => {
  const alumnoId = await idAlumnoDeSesion();
  const { numParciales } = await getParametros();

  const { rows } = await pool.query<FilaMateria>(
    `${SELECT_MATERIAS}
     WHERE r.AlumnoID = $1 AND ci.Activo = TRUE
     ${ORDEN_MATERIAS}`,
    [alumnoId]
  );

  if (rows.length === 0) return [];

  // Parciales capturados. Se vuelve a filtrar por AlumnoID (defensa en profundidad).
  const inscripcionIds = rows.map((r) => r.inscripcionId);
  const { rows: filasParciales } = await pool.query<{
    inscripcionId: number;
    numeroParcial: number;
    calificacion: string | null;
  }>(
    `SELECT cp.InscripcionID AS "inscripcionId",
            cp.NumeroParcial AS "numeroParcial",
            cp.Calificacion  AS "calificacion"
     FROM CalificacionParcial cp
     JOIN Inscripcion i ON i.InscripcionID = cp.InscripcionID
     WHERE i.AlumnoID = $1
       AND cp.InscripcionID = ANY($2::int[])`,
    [alumnoId, inscripcionIds]
  );

  // inscripcionId -> arreglo de N parciales (null = pendiente)
  const parcialesPorInscripcion = new Map<number, (number | null)[]>();
  for (const id of inscripcionIds) {
    parcialesPorInscripcion.set(id, Array<number | null>(numParciales).fill(null));
  }
  for (const p of filasParciales) {
    const arreglo = parcialesPorInscripcion.get(p.inscripcionId);
    if (arreglo && p.numeroParcial >= 1 && p.numeroParcial <= numParciales) {
      arreglo[p.numeroParcial - 1] = num(p.calificacion);
    }
  }

  return rows.map((fila) => ({
    ...mapearMateria(fila),
    parciales: parcialesPorInscripcion.get(fila.inscripcionId) ?? [],
  }));
});

/* ------------------------------------------------------------------ */
/* Resumen general                                                     */
/* ------------------------------------------------------------------ */

export const getResumen = cache(async (): Promise<Resumen> => {
  const alumnoId = await idAlumnoDeSesion();

  const [totales, porEstado] = await Promise.all([
    pool.query<{
      totalMaterias: string;
      materiasAprobadas: string;
      creditosInscritos: string;
      creditosAprobados: string;
      promedioGeneral: string | null;
    }>(
      `SELECT COUNT(*)                                                     AS "totalMaterias",
              COUNT(*) FILTER (WHERE r.Estado = 'Aprobado')                AS "materiasAprobadas",
              COALESCE(SUM(s.Creditos), 0)                                 AS "creditosInscritos",
              COALESCE(SUM(s.Creditos) FILTER (WHERE r.Estado = 'Aprobado'), 0) AS "creditosAprobados",
              ROUND(AVG(r.CalificacionFinal)
                    FILTER (WHERE r.Estado IN ('Aprobado', 'Reprobado')), 2) AS "promedioGeneral"
       FROM vw_ResultadoAsignatura r
       JOIN Asignatura s ON s.AsignaturaID = r.AsignaturaID
       WHERE r.AlumnoID = $1`,
      [alumnoId]
    ),
    pool.query<{ estado: string; total: string }>(
      `SELECT r.Estado AS "estado", COUNT(*) AS "total"
       FROM vw_ResultadoAsignatura r
       WHERE r.AlumnoID = $1
       GROUP BY r.Estado`,
      [alumnoId]
    ),
  ]);

  const t = totales.rows[0];
  const conteo = new Map(porEstado.rows.map((f) => [f.estado, numOrZero(f.total)]));

  return {
    promedioGeneral: num(t?.promedioGeneral),
    creditosAprobados: numOrZero(t?.creditosAprobados),
    creditosInscritos: numOrZero(t?.creditosInscritos),
    totalMaterias: numOrZero(t?.totalMaterias),
    materiasAprobadas: numOrZero(t?.materiasAprobadas),
    porEstado: ESTADOS.filter((e) => (conteo.get(e) ?? 0) > 0).map((e) => ({
      estado: e,
      total: conteo.get(e) ?? 0,
    })),
  };
});

/* ------------------------------------------------------------------ */
/* Historial                                                           */
/* ------------------------------------------------------------------ */

/** Ciclos en los que el alumno tiene inscripciones, con sus estadísticas. */
export const getCiclos = cache(async (): Promise<CicloResumen[]> => {
  const alumnoId = await idAlumnoDeSesion();

  const { rows } = await pool.query<{
    cicloId: number;
    nombreCiclo: string;
    activo: boolean;
    materias: string;
    creditosAprobados: string;
    promedio: string | null;
  }>(
    `SELECT ci.CicloID     AS "cicloId",
            ci.NombreCiclo AS "nombreCiclo",
            ci.Activo      AS "activo",
            COUNT(*)       AS "materias",
            COALESCE(SUM(s.Creditos) FILTER (WHERE r.Estado = 'Aprobado'), 0) AS "creditosAprobados",
            ROUND(AVG(r.CalificacionFinal)
                  FILTER (WHERE r.Estado IN ('Aprobado', 'Reprobado')), 2)    AS "promedio"
     FROM vw_ResultadoAsignatura r
     JOIN Asignatura   s  ON s.AsignaturaID = r.AsignaturaID
     JOIN CicloEscolar ci ON ci.CicloID     = r.CicloID
     WHERE r.AlumnoID = $1
     GROUP BY ci.CicloID
     ORDER BY ci.FechaInicio DESC NULLS LAST, ci.NombreCiclo DESC`,
    [alumnoId]
  );

  return rows.map((f) => ({
    cicloId: f.cicloId,
    nombreCiclo: f.nombreCiclo,
    activo: f.activo,
    materias: numOrZero(f.materias),
    creditosAprobados: numOrZero(f.creditosAprobados),
    promedio: num(f.promedio),
  }));
});

/**
 * Materias de UN ciclo del alumno, con sus extraordinarios.
 * `cicloId` solo acota la búsqueda: el AlumnoID siempre sale de la sesión,
 * así que aunque manipulen el parámetro solo verán sus propios datos.
 */
export const getMateriasDeCiclo = cache(
  async (cicloId: number): Promise<MateriaHistorial[]> => {
    const alumnoId = await idAlumnoDeSesion();

    const { rows } = await pool.query<FilaMateria>(
      `${SELECT_MATERIAS}
       WHERE r.AlumnoID = $1 AND r.CicloID = $2
       ${ORDEN_MATERIAS}`,
      [alumnoId, cicloId]
    );

    if (rows.length === 0) return [];

    const inscripcionIds = rows.map((r) => r.inscripcionId);
    const { rows: filasExtras } = await pool.query<{
      inscripcionId: number;
      orden: number;
      nombreOportunidad: string;
      calificacion: string | null;
      fechaExamen: string | null;
    }>(
      `SELECT e.InscripcionID                        AS "inscripcionId",
              o.Orden                                AS "orden",
              o.NombreOportunidad                    AS "nombreOportunidad",
              e.Calificacion                         AS "calificacion",
              TO_CHAR(e.FechaExamen, 'DD/MM/YYYY')   AS "fechaExamen"
       FROM Extraordinario e
       JOIN Oportunidad o ON o.OportunidadID = e.OportunidadID
       JOIN Inscripcion i ON i.InscripcionID = e.InscripcionID
       WHERE i.AlumnoID = $1
         AND e.InscripcionID = ANY($2::int[])
       ORDER BY e.InscripcionID, o.Orden`,
      [alumnoId, inscripcionIds]
    );

    const extrasPorInscripcion = new Map<number, Extraordinario[]>();
    for (const f of filasExtras) {
      const lista = extrasPorInscripcion.get(f.inscripcionId) ?? [];
      lista.push({
        orden: f.orden,
        nombreOportunidad: f.nombreOportunidad,
        calificacion: num(f.calificacion),
        fechaExamen: f.fechaExamen,
      });
      extrasPorInscripcion.set(f.inscripcionId, lista);
    }

    return rows.map((fila) => ({
      ...mapearMateria(fila),
      extras: extrasPorInscripcion.get(fila.inscripcionId) ?? [],
    }));
  }
);