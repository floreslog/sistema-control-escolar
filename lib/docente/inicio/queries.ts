import pool from '@/lib/db';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getParametros } from '@/lib/docente/calificaciones/queries';
import { accesoGrupo } from '@/lib/docente/alumnos/sql';
import type { MateriaResumen, ResumenInicio } from '@/lib/docente/inicio/types';

/**
 * Resumen del docente en sesión. Todo se filtra por las materias que IMPARTE
 * (ga.DocenteID = session.id), solo en grupos y ciclos activos. Nada llega del cliente.
 */
export async function getResumenInicio(): Promise<ResumenInicio> {
  const session = await requireDocente();
  const parametros = await getParametros();

  const [materiasRes, totalesRes, gruposRes] = await Promise.all([
    pool.query(
      `SELECT
          ga.GrupoAsignaturaID AS grupoasignaturaid,
          ga.GrupoID           AS grupoid,
          s.Clave              AS clave,
          s.NombreAsignatura   AS nombreasignatura,
          g.NombreGrupo        AS nombregrupo,
          ci.NombreCiclo       AS nombreciclo,
          COUNT(r.InscripcionID)::int AS inscritos,
          (COUNT(r.InscripcionID) FILTER (WHERE r.Estado = 'Aprobado'))::int  AS aprobados,
          (COUNT(r.InscripcionID) FILTER (WHERE r.Estado = 'En curso'))::int  AS encurso,
          (COUNT(r.InscripcionID) FILTER (
             WHERE r.Estado IN ('Pendiente de extraordinario', 'Pendiente siguiente extraordinario')
          ))::int AS porenviar,
          (COUNT(r.InscripcionID) FILTER (WHERE r.Estado = 'En extraordinario'))::int AS enextra,
          (COUNT(r.InscripcionID) FILTER (WHERE r.Estado = 'Reprobado'))::int AS reprobados,
          ROUND(AVG(r.Promedio), 2) AS promedio,
          COALESCE(SUM(r.ParcialesCapturados), 0)::int AS capturados
         FROM Grupo_Asignatura ga
         JOIN Grupo g         ON g.GrupoID = ga.GrupoID
         JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
         JOIN Asignatura s    ON s.AsignaturaID = ga.AsignaturaID
         LEFT JOIN vw_ResultadoAsignatura r ON r.GrupoAsignaturaID = ga.GrupoAsignaturaID
        WHERE ga.DocenteID = $1
          AND g.Activo = TRUE
          AND ci.Activo = TRUE
        GROUP BY ga.GrupoAsignaturaID, ga.GrupoID, s.Clave, s.NombreAsignatura,
                 g.NombreGrupo, ci.NombreCiclo
        ORDER BY ci.NombreCiclo DESC, g.NombreGrupo, s.NombreAsignatura`,
      [session.id],
    ),
    // Alumnos distintos y promedio global (el promedio de promedios por materia sería incorrecto).
    pool.query(
      `SELECT
          COUNT(DISTINCT r.AlumnoID)::int AS alumnos,
          ROUND(AVG(r.Promedio), 2)       AS promedio
         FROM Grupo_Asignatura ga
         JOIN Grupo g         ON g.GrupoID = ga.GrupoID
         JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
         JOIN vw_ResultadoAsignatura r ON r.GrupoAsignaturaID = ga.GrupoAsignaturaID
        WHERE ga.DocenteID = $1
          AND g.Activo = TRUE
          AND ci.Activo = TRUE`,
      [session.id],
    ),
    // Grupos activos a los que tiene acceso (los registró o imparte una materia).
    pool.query(
      `SELECT COUNT(*)::int AS grupos
         FROM Grupo g
         JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
        WHERE g.Activo = TRUE
          AND ci.Activo = TRUE
          AND ${accesoGrupo('g')}`,
      [session.id],
    ),
  ]);

  const materias: MateriaResumen[] = materiasRes.rows.map((r) => {
    const inscritos = Number(r.inscritos);
    return {
      grupoAsignaturaId: r.grupoasignaturaid as number,
      grupoId: r.grupoid as number,
      clave: r.clave as string,
      nombre: r.nombreasignatura as string,
      nombreGrupo: r.nombregrupo as string,
      nombreCiclo: r.nombreciclo as string,
      inscritos,
      aprobados: Number(r.aprobados),
      enCurso: Number(r.encurso),
      porEnviar: Number(r.porenviar),
      enExtra: Number(r.enextra),
      reprobados: Number(r.reprobados),
      promedio: r.promedio === null ? null : Number(r.promedio), // NUMERIC llega como string
      capturados: Number(r.capturados),
      esperados: inscritos * parametros.numParciales,
    };
  });

  const totales = totalesRes.rows[0];

  return {
    materias,
    ciclos: [...new Set(materias.map((m) => m.nombreCiclo))],
    grupos: Number(gruposRes.rows[0].grupos),
    alumnos: Number(totales.alumnos),
    promedio: totales.promedio === null ? null : Number(totales.promedio),
    calificacionMinima: parametros.calificacionMinima,
  };
}