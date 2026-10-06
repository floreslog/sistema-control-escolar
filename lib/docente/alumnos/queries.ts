import pool from '@/lib/db';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getParametros } from '@/lib/docente/calificaciones/queries';
import { ES_MIO, accesoGrupo } from '@/lib/docente/alumnos/sql';
import { TAM_PAGINA, patronLike } from '@/lib/docente/utils';
import type {
  AlumnoDetalle,
  AlumnoLista,
  FiltroAlumnosDocente,
  MateriaKardex,
} from '@/lib/docente/alumnos/types';

const NOMBRE_ALUMNO = `a.Nombre || ' ' || a.ApellidoPaterno || COALESCE(' ' || a.ApellidoMaterno, '')`;

// Grupos (a los que el docente tiene acceso) en los que está el alumno.
const GRUPOS_DEL_ALUMNO = `ARRAY(
  SELECT g.NombreGrupo || ' · ' || ci.NombreCiclo
    FROM Grupo_Alumno gal
    JOIN Grupo g         ON g.GrupoID = gal.GrupoID
    JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
   WHERE gal.AlumnoID = a.AlumnoID
     AND g.Activo = TRUE
     AND ${accesoGrupo('g')}
   ORDER BY ci.NombreCiclo DESC, g.NombreGrupo
)`;

/**
 * Alumnos del docente en sesión (ver ES_MIO), con búsqueda, filtro por grupo
 * y paginación. El filtro de grupo también exige acceso al grupo, así que un
 * id ajeno no revela pertenencias.
 */
export async function getAlumnosDocente(
  filtro: FiltroAlumnosDocente,
): Promise<{ alumnos: AlumnoLista[]; total: number }> {
  const session = await requireDocente();

  const pagina = Math.max(1, Math.floor(filtro.pagina) || 1);

  const { rows } = await pool.query(
    `SELECT
        a.AlumnoID  AS alumnoid,
        a.Matricula AS matricula,
        ${NOMBRE_ALUMNO} AS nombrecompleto,
        a.Activo    AS activo,
        (a.PasswordHash IS NULL) AS sincontrasena,
        ${GRUPOS_DEL_ALUMNO} AS grupos,
        COUNT(*) OVER() AS total
       FROM Alumno a
      WHERE ${ES_MIO}
        AND ($2::text = '' OR a.Matricula ILIKE $2 OR (${NOMBRE_ALUMNO}) ILIKE $2)
        AND (
          $3::int = 0
          OR EXISTS (
            SELECT 1
              FROM Grupo_Alumno gf
              JOIN Grupo g2 ON g2.GrupoID = gf.GrupoID
             WHERE gf.AlumnoID = a.AlumnoID
               AND gf.GrupoID = $3
               AND g2.Activo = TRUE
               AND ${accesoGrupo('g2')}
          )
        )
      ORDER BY a.ApellidoPaterno, a.ApellidoMaterno NULLS LAST, a.Nombre
      LIMIT $4 OFFSET $5`,
    [session.id, patronLike(filtro.q), filtro.grupoId, TAM_PAGINA, (pagina - 1) * TAM_PAGINA],
  );

  return {
    alumnos: rows.map((r) => ({
      alumnoId: r.alumnoid as number,
      matricula: r.matricula as string,
      nombreCompleto: r.nombrecompleto as string,
      activo: r.activo as boolean,
      grupos: r.grupos as string[],
      sinContrasena: r.sincontrasena as boolean,
    })),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

/**
 * Ficha + kardex de UN alumno, solo si es "mío". El kardex incluye ÚNICAMENTE
 * las materias que el docente en sesión imparte (ga.DocenteID = session.id):
 * las calificaciones de otros docentes no se exponen.
 */
export async function getAlumnoDetalle(alumnoId: number): Promise<AlumnoDetalle | null> {
  const session = await requireDocente();
  const parametros = await getParametros();

  const { rows: pRows } = await pool.query(
    `SELECT
        a.AlumnoID  AS alumnoid,
        a.Matricula AS matricula,
        ${NOMBRE_ALUMNO} AS nombrecompleto,
        a.Correo    AS correo,
        a.Activo    AS activo,
        (a.PasswordHash IS NULL) AS sincontrasena,
        ${GRUPOS_DEL_ALUMNO} AS grupos
       FROM Alumno a
      WHERE a.AlumnoID = $2
        AND ${ES_MIO}`,
    [session.id, alumnoId],
  );

  const p = pRows[0];
  if (!p) return null;

  const { rows: kRows } = await pool.query(
    `SELECT
        k.InscripcionID        AS inscripcionid,
        k.NombreCiclo          AS nombreciclo,
        k.NombreGrupo          AS nombregrupo,
        k.Clave                AS clave,
        k.NombreAsignatura     AS nombreasignatura,
        k.Creditos             AS creditos,
        k.Promedio             AS promedio,
        k.CalificacionFinal    AS calificacionfinal,
        k.OportunidadAprobacion AS oportunidad,
        k.OportunidadActual    AS oportunidadactual,
        k.Estado               AS estado
       FROM vw_Kardex k
       JOIN Inscripcion i       ON i.InscripcionID = k.InscripcionID
       JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID
      WHERE k.AlumnoID = $2
        AND ga.DocenteID = $1
      ORDER BY k.NombreCiclo DESC, k.Clave`,
    [session.id, alumnoId],
  );

  // Los parciales se piden solo para las inscripciones ya autorizadas arriba.
  const inscripcionIds = kRows.map((r) => r.inscripcionid as number);
  const parcialesPorInsc = new Map<number, (number | null)[]>();

  if (inscripcionIds.length > 0) {
    const { rows: cRows } = await pool.query(
      `SELECT InscripcionID AS inscripcionid, NumeroParcial AS numeroparcial, Calificacion AS calificacion
         FROM CalificacionParcial
        WHERE InscripcionID = ANY($1::int[])
          AND Calificacion IS NOT NULL`,
      [inscripcionIds],
    );

    for (const r of cRows) {
      const parcial = Number(r.numeroparcial);
      if (parcial < 1 || parcial > parametros.numParciales) continue;

      const id = r.inscripcionid as number;
      const arr = parcialesPorInsc.get(id) ?? Array(parametros.numParciales).fill(null);
      arr[parcial - 1] = Number(r.calificacion); // NUMERIC llega como string
      parcialesPorInsc.set(id, arr);
    }
  }

  const kardex: MateriaKardex[] = kRows.map((r) => ({
    inscripcionId: r.inscripcionid as number,
    nombreCiclo: r.nombreciclo as string,
    nombreGrupo: r.nombregrupo as string,
    clave: r.clave as string,
    nombre: r.nombreasignatura as string,
    creditos: r.creditos as number | null,
    parciales:
      parcialesPorInsc.get(r.inscripcionid as number) ?? Array(parametros.numParciales).fill(null),
    promedio: r.promedio === null ? null : Number(r.promedio),
    calificacionFinal: r.calificacionfinal === null ? null : Number(r.calificacionfinal),
    oportunidad: r.oportunidad as string,
    oportunidadActual: Number(r.oportunidadactual),
    estado: r.estado as string,
  }));

  return {
    perfil: {
      alumnoId: p.alumnoid as number,
      matricula: p.matricula as string,
      nombreCompleto: p.nombrecompleto as string,
      correo: p.correo as string | null,
      activo: p.activo as boolean,
      sinContrasena: p.sincontrasena as boolean,
      grupos: p.grupos as string[],
    },
    kardex,
    numParciales: parametros.numParciales,
    calificacionMinima: parametros.calificacionMinima,
  };
}