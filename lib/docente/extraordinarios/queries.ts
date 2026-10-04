import pool from '@/lib/db';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getParametros } from '@/lib/docente/calificaciones/queries';
import type {
  AlumnoExtra,
  AlumnoPorEnviar,
  BloqueMateria,
  DatosExtraordinarios,
  MateriaRef,
} from '@/lib/docente/extraordinarios/types';

const NOMBRE_ALUMNO = `a.Nombre || ' ' || a.ApellidoPaterno || COALESCE(' ' || a.ApellidoMaterno, '')`;

// Orden de la última oportunidad extraordinaria registrada de una inscripción (1 si no hay).
const ORDEN_ACTUAL = `COALESCE((
  SELECT MAX(o2.Orden)
    FROM Extraordinario e2
    JOIN Oportunidad o2 ON o2.OportunidadID = e2.OportunidadID
   WHERE e2.InscripcionID = r.InscripcionID
), 1)`;

function materiaDeFila(r: Record<string, unknown>): MateriaRef {
  return {
    grupoAsignaturaId: r.grupoasignaturaid as number,
    clave: r.clave as string,
    nombre: r.nombreasignatura as string,
    nombreGrupo: r.nombregrupo as string,
    nombreCiclo: r.nombreciclo as string,
  };
}

function agrupar<T>(filas: { materia: MateriaRef; alumno: T }[]): BloqueMateria<T>[] {
  const mapa = new Map<number, BloqueMateria<T>>();
  for (const f of filas) {
    let bloque = mapa.get(f.materia.grupoAsignaturaId);
    if (!bloque) {
      bloque = { materia: f.materia, alumnos: [] };
      mapa.set(f.materia.grupoAsignaturaId, bloque);
    }
    bloque.alumnos.push(f.alumno);
  }
  return [...mapa.values()];
}

/**
 * Todo filtrado por las materias que el docente en sesión IMPARTE
 * (ga.DocenteID = session.id) y por ciclos activos.
 */
export async function getExtraordinarios(): Promise<DatosExtraordinarios> {
  const session = await requireDocente();
  const parametros = await getParametros();

  const [porEnviarRes, capturaRes] = await Promise.all([
    // Alumnos que ya pueden pasar a la siguiente oportunidad.
    pool.query(
      `SELECT
          r.InscripcionID      AS inscripcionid,
          r.Promedio           AS promedio,
          r.Estado             AS estado,
          ga.GrupoAsignaturaID AS grupoasignaturaid,
          s.Clave              AS clave,
          s.NombreAsignatura   AS nombreasignatura,
          g.NombreGrupo        AS nombregrupo,
          ci.NombreCiclo       AS nombreciclo,
          a.Matricula          AS matricula,
          ${NOMBRE_ALUMNO}     AS nombrecompleto,
          o.NombreOportunidad  AS siguiente
         FROM vw_ResultadoAsignatura r
         JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = r.GrupoAsignaturaID
         JOIN Grupo g             ON g.GrupoID = ga.GrupoID
         JOIN CicloEscolar ci     ON ci.CicloID = g.CicloID
         JOIN Asignatura s        ON s.AsignaturaID = ga.AsignaturaID
         JOIN Alumno a            ON a.AlumnoID = r.AlumnoID
         JOIN Oportunidad o       ON o.Orden = ${ORDEN_ACTUAL} + 1
        WHERE ga.DocenteID = $1
          AND g.Activo = TRUE
          AND ci.Activo = TRUE
          AND r.Estado IN ('Pendiente de extraordinario', 'Pendiente siguiente extraordinario')
        ORDER BY ci.NombreCiclo DESC, g.NombreGrupo, s.NombreAsignatura, ga.GrupoAsignaturaID,
                 a.ApellidoPaterno, a.ApellidoMaterno NULLS LAST, a.Nombre`,
      [session.id],
    ),
    // Última oportunidad extraordinaria de cada inscripción (la única editable).
    pool.query(
      `SELECT
          e.ExtraordinarioID   AS extraordinarioid,
          e.InscripcionID      AS inscripcionid,
          e.Calificacion       AS calificacion,
          to_char(e.FechaExamen, 'YYYY-MM-DD') AS fechaexamen,
          o.NombreOportunidad  AS nombreoportunidad,
          r.Estado             AS estado,
          ga.GrupoAsignaturaID AS grupoasignaturaid,
          s.Clave              AS clave,
          s.NombreAsignatura   AS nombreasignatura,
          g.NombreGrupo        AS nombregrupo,
          ci.NombreCiclo       AS nombreciclo,
          a.Matricula          AS matricula,
          ${NOMBRE_ALUMNO}     AS nombrecompleto
         FROM Extraordinario e
         JOIN Oportunidad o       ON o.OportunidadID = e.OportunidadID
         JOIN Inscripcion i       ON i.InscripcionID = e.InscripcionID
         JOIN vw_ResultadoAsignatura r ON r.InscripcionID = i.InscripcionID
         JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID
         JOIN Grupo g             ON g.GrupoID = ga.GrupoID
         JOIN CicloEscolar ci     ON ci.CicloID = g.CicloID
         JOIN Asignatura s        ON s.AsignaturaID = ga.AsignaturaID
         JOIN Alumno a            ON a.AlumnoID = i.AlumnoID
        WHERE ga.DocenteID = $1
          AND g.Activo = TRUE
          AND ci.Activo = TRUE
          AND o.Orden = (
            SELECT MAX(o2.Orden)
              FROM Extraordinario e2
              JOIN Oportunidad o2 ON o2.OportunidadID = e2.OportunidadID
             WHERE e2.InscripcionID = e.InscripcionID
          )
        ORDER BY ci.NombreCiclo DESC, g.NombreGrupo, s.NombreAsignatura, ga.GrupoAsignaturaID,
                 (e.Calificacion IS NULL) DESC,
                 a.ApellidoPaterno, a.ApellidoMaterno NULLS LAST, a.Nombre`,
      [session.id],
    ),
  ]);

  const porEnviar = agrupar<AlumnoPorEnviar>(
    porEnviarRes.rows.map((r) => ({
      materia: materiaDeFila(r),
      alumno: {
        inscripcionId: r.inscripcionid as number,
        matricula: r.matricula as string,
        nombreCompleto: r.nombrecompleto as string,
        promedio: r.promedio === null ? null : Number(r.promedio), // NUMERIC llega como string
        estado: r.estado as string,
        siguienteOportunidad: r.siguiente as string,
      },
    })),
  );

  const captura = agrupar<AlumnoExtra>(
    capturaRes.rows.map((r) => ({
      materia: materiaDeFila(r),
      alumno: {
        extraordinarioId: r.extraordinarioid as number,
        inscripcionId: r.inscripcionid as number,
        matricula: r.matricula as string,
        nombreCompleto: r.nombrecompleto as string,
        oportunidad: r.nombreoportunidad as string,
        calificacion: r.calificacion === null ? null : Number(r.calificacion),
        fechaExamen: (r.fechaexamen as string | null) ?? '',
        estado: r.estado as string,
      },
    })),
  );

  return { porEnviar, captura, calificacionMinima: parametros.calificacionMinima };
}