import pool from '@/lib/db';
import { requireDocente } from '@/lib/docente/requireDocente';
import type {
  AlumnoCaptura,
  MateriaCalificable,
  MateriaCaptura,
  ParametrosCalif,
} from '@/lib/docente/calificaciones/types';

const NOMBRE_ALUMNO = `a.Nombre || ' ' || a.ApellidoPaterno || COALESCE(' ' || a.ApellidoMaterno, '')`;

export async function getParametros(): Promise<ParametrosCalif> {
  await requireDocente();

  const { rows } = await pool.query(
    `SELECT CalificacionMinima AS calificacionminima, NumParciales AS numparciales
       FROM Parametro
      WHERE ParametroID = 1`,
  );

  const r = rows[0];
  return {
    calificacionMinima: Number(r.calificacionminima), // NUMERIC llega como string
    numParciales: Number(r.numparciales),
  };
}

/** Materias que el docente en sesión IMPARTE (Grupo_Asignatura.DocenteID). */
export async function getMateriasCalificables(): Promise<{
  materias: MateriaCalificable[];
  parametros: ParametrosCalif;
}> {
  const session = await requireDocente();
  const parametros = await getParametros();

  const [materiasRes, capturadosRes] = await Promise.all([
    pool.query(
      `SELECT
          ga.GrupoAsignaturaID AS grupoasignaturaid,
          ga.GrupoID           AS grupoid,
          s.Clave              AS clave,
          s.NombreAsignatura   AS nombreasignatura,
          g.NombreGrupo        AS nombregrupo,
          ci.NombreCiclo       AS nombreciclo,
          ci.Activo            AS cicloactivo,
          (SELECT COUNT(*) FROM Inscripcion i
            WHERE i.GrupoAsignaturaID = ga.GrupoAsignaturaID) AS inscritos
         FROM Grupo_Asignatura ga
         JOIN Grupo g         ON g.GrupoID = ga.GrupoID
         JOIN Asignatura s    ON s.AsignaturaID = ga.AsignaturaID
         JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
        WHERE ga.DocenteID = $1
          AND g.Activo = TRUE
        ORDER BY ci.Activo DESC, ci.NombreCiclo DESC, g.NombreGrupo, s.NombreAsignatura`,
      [session.id],
    ),
    pool.query(
      `SELECT
          i.GrupoAsignaturaID AS grupoasignaturaid,
          cp.NumeroParcial    AS numeroparcial,
          COUNT(*)            AS capturados
         FROM CalificacionParcial cp
         JOIN Inscripcion i       ON i.InscripcionID = cp.InscripcionID
         JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID
        WHERE ga.DocenteID = $1
          AND cp.Calificacion IS NOT NULL
        GROUP BY i.GrupoAsignaturaID, cp.NumeroParcial`,
      [session.id],
    ),
  ]);

  const capturadosPorMateria = new Map<number, number[]>();
  for (const r of capturadosRes.rows) {
    const gaId = r.grupoasignaturaid as number;
    const parcial = Number(r.numeroparcial);
    if (parcial < 1 || parcial > parametros.numParciales) continue;

    const arr = capturadosPorMateria.get(gaId) ?? Array(parametros.numParciales).fill(0);
    arr[parcial - 1] = Number(r.capturados);
    capturadosPorMateria.set(gaId, arr);
  }

  const materias: MateriaCalificable[] = materiasRes.rows.map((r) => ({
    grupoAsignaturaId: r.grupoasignaturaid as number,
    grupoId: r.grupoid as number,
    clave: r.clave as string,
    nombre: r.nombreasignatura as string,
    nombreGrupo: r.nombregrupo as string,
    nombreCiclo: r.nombreciclo as string,
    cicloActivo: r.cicloactivo as boolean,
    inscritos: Number(r.inscritos),
    capturados:
      capturadosPorMateria.get(r.grupoasignaturaid as number) ??
      Array(parametros.numParciales).fill(0),
  }));

  return { materias, parametros };
}

/**
 * Datos de captura de UNA materia, solo si el docente en sesión la imparte
 * (ga.DocenteID = session.id). Si no, null.
 */
export async function getCapturaMateria(grupoAsignaturaId: number): Promise<{
  materia: MateriaCaptura;
  alumnos: AlumnoCaptura[];
  parametros: ParametrosCalif;
} | null> {
  const session = await requireDocente();
  const parametros = await getParametros();

  const { rows: mRows } = await pool.query(
    `SELECT
        ga.GrupoAsignaturaID AS grupoasignaturaid,
        ga.GrupoID           AS grupoid,
        s.Clave              AS clave,
        s.NombreAsignatura   AS nombreasignatura,
        g.NombreGrupo        AS nombregrupo,
        ci.NombreCiclo       AS nombreciclo,
        ci.Activo            AS cicloactivo
       FROM Grupo_Asignatura ga
       JOIN Grupo g         ON g.GrupoID = ga.GrupoID
       JOIN Asignatura s    ON s.AsignaturaID = ga.AsignaturaID
       JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
      WHERE ga.GrupoAsignaturaID = $1
        AND ga.DocenteID = $2
        AND g.Activo = TRUE`,
    [grupoAsignaturaId, session.id],
  );

  const m = mRows[0];
  if (!m) return null;

  const [alumnosRes, parcialesRes] = await Promise.all([
    pool.query(
      `SELECT
          i.InscripcionID AS inscripcionid,
          a.Matricula     AS matricula,
          ${NOMBRE_ALUMNO} AS nombrecompleto,
          r.Promedio      AS promedio,
          r.Estado        AS estado,
          EXISTS (SELECT 1 FROM Extraordinario e
                   WHERE e.InscripcionID = i.InscripcionID) AS bloqueado
         FROM Inscripcion i
         JOIN Alumno a ON a.AlumnoID = i.AlumnoID
         JOIN vw_ResultadoAsignatura r ON r.InscripcionID = i.InscripcionID
        WHERE i.GrupoAsignaturaID = $1
        ORDER BY a.ApellidoPaterno, a.ApellidoMaterno NULLS LAST, a.Nombre`,
      [grupoAsignaturaId],
    ),
    pool.query(
      `SELECT
          cp.InscripcionID AS inscripcionid,
          cp.NumeroParcial AS numeroparcial,
          cp.Calificacion  AS calificacion
         FROM CalificacionParcial cp
         JOIN Inscripcion i ON i.InscripcionID = cp.InscripcionID
        WHERE i.GrupoAsignaturaID = $1`,
      [grupoAsignaturaId],
    ),
  ]);

  const parcialesPorInsc = new Map<number, (number | null)[]>();
  for (const r of parcialesRes.rows) {
    const parcial = Number(r.numeroparcial);
    if (parcial < 1 || parcial > parametros.numParciales) continue;
    if (r.calificacion === null) continue;

    const inscId = r.inscripcionid as number;
    const arr = parcialesPorInsc.get(inscId) ?? Array(parametros.numParciales).fill(null);
    arr[parcial - 1] = Number(r.calificacion);
    parcialesPorInsc.set(inscId, arr);
  }

  const alumnos: AlumnoCaptura[] = alumnosRes.rows.map((r) => ({
    inscripcionId: r.inscripcionid as number,
    matricula: r.matricula as string,
    nombreCompleto: r.nombrecompleto as string,
    parciales:
      parcialesPorInsc.get(r.inscripcionid as number) ?? Array(parametros.numParciales).fill(null),
    promedio: r.promedio === null ? null : Number(r.promedio),
    estado: r.estado as string,
    bloqueado: r.bloqueado as boolean,
  }));

  return {
    materia: {
      grupoAsignaturaId: m.grupoasignaturaid as number,
      grupoId: m.grupoid as number,
      clave: m.clave as string,
      nombre: m.nombreasignatura as string,
      nombreGrupo: m.nombregrupo as string,
      nombreCiclo: m.nombreciclo as string,
      editable: m.cicloactivo as boolean,
    },
    alumnos,
    parametros,
  };
}