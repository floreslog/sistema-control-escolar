import pool from '@/lib/db';
import { requireDocente } from '@/lib/docente/requireDocente';
import { TAM_PAGINA, patronLike } from '@/lib/docente/utils';
import type {
  AlumnoCatalogo,
  AlumnoGrupo,
  AlumnoInscripcion,
  AsignaturaOpcion,
  CicloOpcion,
  FiltroAlumnos,
  GrupoBasico,
  GrupoDetalle,
  GrupoResumen,
  MateriaGrupo,
  MateriaInscripciones,
} from '@/lib/docente/types';

const NOMBRE_ALUMNO = `a.Nombre || ' ' || a.ApellidoPaterno || COALESCE(' ' || a.ApellidoMaterno, '')`;

export interface PerfilDocente {
  nombreCompleto: string;
  numeroEmpleado: string;
}

export async function getPerfil(): Promise<PerfilDocente | null> {
  const session = await requireDocente();

  const { rows } = await pool.query(
    `SELECT
        d.Nombre || ' ' || d.ApellidoPaterno || COALESCE(' ' || d.ApellidoMaterno, '') AS nombrecompleto,
        d.NumeroEmpleado AS numeroempleado
       FROM Docente d
      WHERE d.DocenteID = $1
        AND d.Activo = TRUE`,
    [session.id],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    nombreCompleto: row.nombrecompleto as string,
    numeroEmpleado: row.numeroempleado as string,
  };
}

export async function getGrupos(): Promise<GrupoResumen[]> {
  const session = await requireDocente();

  const { rows } = await pool.query(
    `SELECT
        g.GrupoID        AS grupoid,
        g.NombreGrupo    AS nombregrupo,
        g.Semestre       AS semestre,
        g.Turno          AS turno,
        ci.NombreCiclo   AS nombreciclo,
        ci.Activo        AS cicloactivo,
        (g.DocenteID = $1) AS esdueno,
        (SELECT COUNT(*) FROM Grupo_Alumno gal WHERE gal.GrupoID = g.GrupoID) AS totalalumnos,
        (SELECT COUNT(*) FROM Grupo_Asignatura gx WHERE gx.GrupoID = g.GrupoID) AS totalmaterias
       FROM Grupo g
       JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
      WHERE g.Activo = TRUE
        AND (
          g.DocenteID = $1
          OR EXISTS (
            SELECT 1 FROM Grupo_Asignatura ga
             WHERE ga.GrupoID = g.GrupoID AND ga.DocenteID = $1
          )
        )
      ORDER BY ci.Activo DESC, ci.NombreCiclo DESC, g.NombreGrupo`,
    [session.id],
  );

  return rows.map((r) => ({
    grupoId: r.grupoid as number,
    nombreGrupo: r.nombregrupo as string,
    semestre: r.semestre as number | null,
    turno: r.turno as string | null,
    nombreCiclo: r.nombreciclo as string,
    cicloActivo: r.cicloactivo as boolean,
    esDueno: r.esdueno as boolean,
    totalAlumnos: Number(r.totalalumnos),
    totalMaterias: Number(r.totalmaterias),
  }));
}

/**
 * Datos del grupo SOLO si el docente en sesión tiene acceso (es quien lo
 * registró o imparte una materia en él). Si no, null.
 */
export async function getGrupoBasico(grupoId: number): Promise<GrupoBasico | null> {
  const session = await requireDocente();

  const { rows } = await pool.query(
    `SELECT
        g.GrupoID      AS grupoid,
        g.NombreGrupo  AS nombregrupo,
        g.Semestre     AS semestre,
        g.Turno        AS turno,
        ci.NombreCiclo AS nombreciclo,
        (g.DocenteID = $2) AS esdueno
       FROM Grupo g
       JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
      WHERE g.GrupoID = $1
        AND g.Activo = TRUE
        AND (
          g.DocenteID = $2
          OR EXISTS (
            SELECT 1 FROM Grupo_Asignatura ga
             WHERE ga.GrupoID = g.GrupoID AND ga.DocenteID = $2
          )
        )`,
    [grupoId, session.id],
  );

  const r = rows[0];
  if (!r) return null;

  return {
    grupoId: r.grupoid as number,
    nombreGrupo: r.nombregrupo as string,
    semestre: r.semestre as number | null,
    turno: r.turno as string | null,
    nombreCiclo: r.nombreciclo as string,
    esDueno: r.esdueno as boolean,
  };
}

export async function getGrupoDetalle(grupoId: number): Promise<GrupoDetalle | null> {
  const session = await requireDocente();

  const basico = await getGrupoBasico(grupoId);
  if (!basico) return null;

  const [materiasRes, alumnosRes] = await Promise.all([
    pool.query(
      `SELECT
          ga.GrupoAsignaturaID AS grupoasignaturaid,
          s.AsignaturaID       AS asignaturaid,
          s.Clave              AS clave,
          s.NombreAsignatura   AS nombreasignatura,
          s.Creditos           AS creditos,
          (ga.DocenteID = $2)  AS puedogestionar,
          (SELECT COUNT(*) FROM Inscripcion i
            WHERE i.GrupoAsignaturaID = ga.GrupoAsignaturaID) AS inscritos
         FROM Grupo_Asignatura ga
         JOIN Asignatura s ON s.AsignaturaID = ga.AsignaturaID
        WHERE ga.GrupoID = $1
        ORDER BY s.NombreAsignatura`,
      [grupoId, session.id],
    ),
    pool.query(
      `SELECT
          a.AlumnoID  AS alumnoid,
          a.Matricula AS matricula,
          ${NOMBRE_ALUMNO} AS nombrecompleto,
          COALESCE(
            array_agg(i.GrupoAsignaturaID) FILTER (WHERE i.GrupoAsignaturaID IS NOT NULL),
            '{}'::int[]
          ) AS materias
         FROM Grupo_Alumno gal
         JOIN Alumno a ON a.AlumnoID = gal.AlumnoID
         LEFT JOIN Inscripcion i
                ON i.AlumnoID = a.AlumnoID
               AND i.GrupoAsignaturaID IN (
                     SELECT GrupoAsignaturaID FROM Grupo_Asignatura WHERE GrupoID = $1
                   )
        WHERE gal.GrupoID = $1
        GROUP BY a.AlumnoID, a.Matricula, a.Nombre, a.ApellidoPaterno, a.ApellidoMaterno
        ORDER BY a.ApellidoPaterno, a.ApellidoMaterno NULLS LAST, a.Nombre`,
      [grupoId],
    ),
  ]);

  const materias: MateriaGrupo[] = materiasRes.rows.map((r) => ({
    grupoAsignaturaId: r.grupoasignaturaid as number,
    asignaturaId: r.asignaturaid as number,
    clave: r.clave as string,
    nombre: r.nombreasignatura as string,
    creditos: r.creditos as number | null,
    puedoGestionar: r.puedogestionar as boolean,
    inscritos: Number(r.inscritos),
  }));

  const alumnos: AlumnoGrupo[] = alumnosRes.rows.map((r) => ({
    alumnoId: r.alumnoid as number,
    matricula: r.matricula as string,
    nombreCompleto: r.nombrecompleto as string,
    materias: (r.materias as number[]).map(Number),
  }));

  return { ...basico, materias, alumnos };
}

/** Ciclos activos para crear un grupo. */
export async function getCiclosActivos(): Promise<CicloOpcion[]> {
  await requireDocente();

  const { rows } = await pool.query(
    `SELECT CicloID AS cicloid, NombreCiclo AS nombreciclo
       FROM CicloEscolar
      WHERE Activo = TRUE
      ORDER BY NombreCiclo DESC`,
  );

  return rows.map((r) => ({
    cicloId: r.cicloid as number,
    nombreCiclo: r.nombreciclo as string,
  }));
}

/** Asignaturas activas que aún no están en el grupo (solo si el docente es titular). */
export async function getAsignaturasDisponibles(grupoId: number): Promise<AsignaturaOpcion[]> {
  const session = await requireDocente();

  const { rows } = await pool.query(
    `SELECT s.AsignaturaID AS asignaturaid, s.Clave AS clave, s.NombreAsignatura AS nombreasignatura
       FROM Asignatura s
       JOIN Grupo g ON g.GrupoID = $1 AND g.DocenteID = $2 AND g.Activo = TRUE
      WHERE s.Activo = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM Grupo_Asignatura ga
           WHERE ga.GrupoID = $1 AND ga.AsignaturaID = s.AsignaturaID
        )
      ORDER BY s.NombreAsignatura`,
    [grupoId, session.id],
  );

  return rows.map((r) => ({
    asignaturaId: r.asignaturaid as number,
    clave: r.clave as string,
    nombre: r.nombreasignatura as string,
  }));
}

/**
 * Todos los alumnos activos que AÚN no están en el grupo, con búsqueda,
 * filtro y paginación. Solo funciona si el docente es titular del grupo
 * (el JOIN con Grupo lo garantiza dentro de la misma query).
 */
export async function getAlumnosDisponibles(
  grupoId: number,
  filtro: FiltroAlumnos,
): Promise<{ alumnos: AlumnoCatalogo[]; total: number }> {
  const session = await requireDocente();

  const pagina = Math.max(1, Math.floor(filtro.pagina) || 1);

  const { rows } = await pool.query(
    `SELECT
        a.AlumnoID  AS alumnoid,
        a.Matricula AS matricula,
        ${NOMBRE_ALUMNO} AS nombrecompleto,
        COUNT(*) OVER() AS total
       FROM Alumno a
       JOIN Grupo tg ON tg.GrupoID = $1 AND tg.DocenteID = $2 AND tg.Activo = TRUE
      WHERE a.Activo = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM Grupo_Alumno gal
           WHERE gal.GrupoID = $1 AND gal.AlumnoID = a.AlumnoID
        )
        AND ($3::text = '' OR a.Matricula ILIKE $3 OR (${NOMBRE_ALUMNO}) ILIKE $3)
        AND (
          $4::boolean = FALSE
          OR NOT EXISTS (
            SELECT 1 FROM Grupo_Alumno x
              JOIN Grupo gx ON gx.GrupoID = x.GrupoID
             WHERE x.AlumnoID = a.AlumnoID
               AND gx.CicloID = tg.CicloID
               AND gx.Activo = TRUE
          )
        )
      ORDER BY a.ApellidoPaterno, a.ApellidoMaterno NULLS LAST, a.Nombre
      LIMIT $5 OFFSET $6`,
    [
      grupoId,
      session.id,
      patronLike(filtro.q),
      filtro.soloSinGrupo,
      TAM_PAGINA,
      (pagina - 1) * TAM_PAGINA,
    ],
  );

  return {
    alumnos: rows.map((r) => ({
      alumnoId: r.alumnoid as number,
      matricula: r.matricula as string,
      nombreCompleto: r.nombrecompleto as string,
    })),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

/**
 * Materia + alumnos del grupo con su estado de inscripción. Solo si el docente
 * en sesión IMPARTE esa materia (ga.DocenteID = session.id).
 */
export async function getInscripcionesMateria(
  grupoId: number,
  grupoAsignaturaId: number,
): Promise<{ materia: MateriaInscripciones; alumnos: AlumnoInscripcion[] } | null> {
  const session = await requireDocente();

  const { rows: mRows } = await pool.query(
    `SELECT
        ga.GrupoAsignaturaID AS grupoasignaturaid,
        ga.GrupoID           AS grupoid,
        s.Clave              AS clave,
        s.NombreAsignatura   AS nombreasignatura,
        g.NombreGrupo        AS nombregrupo,
        ci.NombreCiclo       AS nombreciclo
       FROM Grupo_Asignatura ga
       JOIN Grupo g         ON g.GrupoID = ga.GrupoID
       JOIN Asignatura s    ON s.AsignaturaID = ga.AsignaturaID
       JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
      WHERE ga.GrupoAsignaturaID = $1
        AND ga.GrupoID = $2
        AND ga.DocenteID = $3
        AND g.Activo = TRUE`,
    [grupoAsignaturaId, grupoId, session.id],
  );

  const m = mRows[0];
  if (!m) return null;

  const { rows } = await pool.query(
    `SELECT
        a.AlumnoID  AS alumnoid,
        a.Matricula AS matricula,
        ${NOMBRE_ALUMNO} AS nombrecompleto,
        (i.InscripcionID IS NOT NULL) AS inscrito,
        (
          i.InscripcionID IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM CalificacionParcial cp
                     WHERE cp.InscripcionID = i.InscripcionID AND cp.Calificacion IS NOT NULL)
            OR EXISTS (SELECT 1 FROM Extraordinario e WHERE e.InscripcionID = i.InscripcionID)
          )
        ) AS tienecalificaciones
       FROM Grupo_Alumno gal
       JOIN Alumno a ON a.AlumnoID = gal.AlumnoID
       LEFT JOIN Inscripcion i
              ON i.AlumnoID = a.AlumnoID AND i.GrupoAsignaturaID = $1
      WHERE gal.GrupoID = $2
      ORDER BY a.ApellidoPaterno, a.ApellidoMaterno NULLS LAST, a.Nombre`,
    [grupoAsignaturaId, grupoId],
  );

  return {
    materia: {
      grupoAsignaturaId: m.grupoasignaturaid as number,
      grupoId: m.grupoid as number,
      clave: m.clave as string,
      nombre: m.nombreasignatura as string,
      nombreGrupo: m.nombregrupo as string,
      nombreCiclo: m.nombreciclo as string,
    },
    alumnos: rows.map((r) => ({
      alumnoId: r.alumnoid as number,
      matricula: r.matricula as string,
      nombreCompleto: r.nombrecompleto as string,
      inscrito: r.inscrito as boolean,
      tieneCalificaciones: r.tienecalificaciones as boolean,
    })),
  };
}