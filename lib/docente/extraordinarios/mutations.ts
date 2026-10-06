import pool from '@/lib/db';
import { plural } from '@/lib/docente/utils';
import type { Resultado } from '@/lib/docente/mutations';

/**
 * Escrituras de extraordinarios. docenteId viene SIEMPRE de la sesión y la
 * propiedad (ga.DocenteID) y el ciclo activo se comprueban dentro de cada query.
 */

// Condición "esta fila es la última oportunidad extraordinaria de su inscripción".
const ES_ULTIMA = `(
  SELECT o.Orden FROM Oportunidad o WHERE o.OportunidadID = e.OportunidadID
) = (
  SELECT MAX(o2.Orden)
    FROM Extraordinario e2
    JOIN Oportunidad o2 ON o2.OportunidadID = e2.OportunidadID
   WHERE e2.InscripcionID = e.InscripcionID
)`;

/**
 * Envía a la siguiente oportunidad a los alumnos elegidos. Solo pasan los que,
 * según vw_ResultadoAsignatura, están en "Pendiente de extraordinario" o
 * "Pendiente siguiente extraordinario" (parciales completos y sin aprobar).
 */
export async function enviarAExtraordinario(
  docenteId: number,
  grupoAsignaturaId: number,
  inscripcionIds: number[],
): Promise<Resultado> {
  const r = await pool.query(
    `INSERT INTO Extraordinario (InscripcionID, OportunidadID)
     SELECT r.InscripcionID, o.OportunidadID
       FROM vw_ResultadoAsignatura r
       JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = r.GrupoAsignaturaID
       JOIN Grupo g             ON g.GrupoID = ga.GrupoID
       JOIN CicloEscolar ci     ON ci.CicloID = g.CicloID
       JOIN Oportunidad o ON o.Orden = COALESCE((
              SELECT MAX(o2.Orden)
                FROM Extraordinario e2
                JOIN Oportunidad o2 ON o2.OportunidadID = e2.OportunidadID
               WHERE e2.InscripcionID = r.InscripcionID
            ), 1) + 1
      WHERE r.InscripcionID = ANY($2::int[])
        AND ga.GrupoAsignaturaID = $3
        AND ga.DocenteID = $1
        AND g.Activo = TRUE
        AND ci.Activo = TRUE
        AND r.Estado IN ('Pendiente de extraordinario', 'Pendiente siguiente extraordinario')
     ON CONFLICT (InscripcionID, OportunidadID) DO NOTHING`,
    [docenteId, inscripcionIds, grupoAsignaturaId],
  );

  const enviados = r.rowCount ?? 0;
  const omitidos = inscripcionIds.length - enviados;

  if (enviados === 0) {
    return { ok: false, mensaje: 'No se envió a ningún alumno (ya no cumplen las condiciones o ya fueron enviados).' };
  }

  return {
    ok: true,
    mensaje:
      `${plural(enviados, 'alumno enviado', 'alumnos enviados')} a extraordinario.` +
      (omitidos > 0 ? ` ${plural(omitidos, 'se omitió', 'se omitieron')} por no cumplir las condiciones.` : ''),
  };
}

export interface CambioExtra {
  extraordinarioId: number;
  calificacion: number | null;
  /** 'YYYY-MM-DD' o null. */
  fecha: string | null;
}

/**
 * Guarda calificación y fecha de la ÚLTIMA oportunidad de cada inscripción.
 * Solo escribe lo que cambió. Una calificación vacía vuelve a "En extraordinario".
 */
export async function guardarExtraordinarios(
  docenteId: number,
  grupoAsignaturaId: number,
  cambios: CambioExtra[],
): Promise<Resultado> {
  const r = await pool.query(
    `UPDATE Extraordinario e
        SET Calificacion = x.cal,
            FechaExamen  = x.fecha
       FROM unnest($3::int[], $4::numeric[], $5::date[]) AS x(id, cal, fecha),
            Inscripcion i
            JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID
            JOIN Grupo g             ON g.GrupoID = ga.GrupoID
            JOIN CicloEscolar ci     ON ci.CicloID = g.CicloID
      WHERE e.ExtraordinarioID = x.id
        AND i.InscripcionID = e.InscripcionID
        AND ga.GrupoAsignaturaID = $2
        AND ga.DocenteID = $1
        AND g.Activo = TRUE
        AND ci.Activo = TRUE
        AND ${ES_ULTIMA}
        AND (e.Calificacion IS DISTINCT FROM x.cal OR e.FechaExamen IS DISTINCT FROM x.fecha)`,
    [
      docenteId,
      grupoAsignaturaId,
      cambios.map((c) => c.extraordinarioId),
      cambios.map((c) => c.calificacion),
      cambios.map((c) => c.fecha),
    ],
  );

  const guardados = r.rowCount ?? 0;
  if (guardados === 0) return { ok: true, mensaje: 'No hubo cambios que guardar.' };

  return {
    ok: true,
    mensaje: plural(guardados, 'registro guardado', 'registros guardados') + '.',
  };
}

/**
 * Cancela un envío hecho por error: solo la última oportunidad y solo si
 * todavía no tiene calificación.
 */
export async function cancelarEnvio(
  docenteId: number,
  grupoAsignaturaId: number,
  extraordinarioId: number,
): Promise<Resultado> {
  const r = await pool.query(
    `DELETE FROM Extraordinario e
      USING Inscripcion i, Grupo_Asignatura ga, Grupo g, CicloEscolar ci
      WHERE e.ExtraordinarioID = $3
        AND i.InscripcionID = e.InscripcionID
        AND ga.GrupoAsignaturaID = i.GrupoAsignaturaID
        AND ga.GrupoAsignaturaID = $2
        AND ga.DocenteID = $1
        AND g.GrupoID = ga.GrupoID
        AND g.Activo = TRUE
        AND ci.CicloID = g.CicloID
        AND ci.Activo = TRUE
        AND e.Calificacion IS NULL
        AND ${ES_ULTIMA}`,
    [docenteId, grupoAsignaturaId, extraordinarioId],
  );

  if ((r.rowCount ?? 0) === 0) {
    return { ok: false, mensaje: 'No se pudo cancelar: ya tiene calificación o no es la última oportunidad.' };
  }
  return { ok: true, mensaje: 'Envío cancelado.' };
}