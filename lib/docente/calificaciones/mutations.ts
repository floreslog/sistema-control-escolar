import pool from '@/lib/db';
import { plural } from '@/lib/docente/utils';
import type { Resultado } from '@/lib/docente/mutations';
import type { CambioCalificacion } from '@/lib/docente/calificaciones/types';

export async function guardarCalificaciones(
  docenteId: number,
  grupoAsignaturaId: number,
  cambios: CambioCalificacion[],
): Promise<Resultado> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verifica propiedad y bloquea la materia para serializar guardados simultáneos.
    const permiso = await client.query(
      `SELECT ci.Activo AS activo, prm.NumParciales AS numparciales
         FROM Grupo_Asignatura ga
         JOIN Grupo g         ON g.GrupoID = ga.GrupoID
         JOIN CicloEscolar ci ON ci.CicloID = g.CicloID
         CROSS JOIN Parametro prm
        WHERE ga.GrupoAsignaturaID = $1
          AND ga.DocenteID = $2
          AND g.Activo = TRUE
        FOR UPDATE OF ga`,
      [grupoAsignaturaId, docenteId],
    );

    const p = permiso.rows[0];
    if (!p) {
      await client.query('ROLLBACK');
      return { ok: false, mensaje: 'Materia no encontrada.' };
    }
    if (!p.activo) {
      await client.query('ROLLBACK');
      return { ok: false, mensaje: 'El ciclo escolar ya no está activo: no se pueden modificar calificaciones.' };
    }

    const numParciales = Number(p.numparciales);
    if (cambios.some((c) => c.parcial < 1 || c.parcial > numParciales)) {
      await client.query('ROLLBACK');
      return { ok: false, mensaje: 'Número de parcial inválido.' };
    }

    // Una sola entrada por celda (gana la última).
    const porCelda = new Map<string, CambioCalificacion>();
    for (const c of cambios) porCelda.set(`${c.inscripcionId}_${c.parcial}`, c);
    const solicitados = [...porCelda.values()];

    // Inscripciones editables: de esta materia y sin extraordinario.
    const editablesRes = await client.query(
      `SELECT i.InscripcionID AS inscripcionid
         FROM Inscripcion i
        WHERE i.GrupoAsignaturaID = $1
          AND i.InscripcionID = ANY($2::int[])
          AND NOT EXISTS (SELECT 1 FROM Extraordinario e WHERE e.InscripcionID = i.InscripcionID)`,
      [grupoAsignaturaId, [...new Set(solicitados.map((c) => c.inscripcionId))]],
    );
    const editables = new Set<number>(editablesRes.rows.map((r) => Number(r.inscripcionid)));

    const permitidos = solicitados.filter((c) => editables.has(c.inscripcionId));
    const omitidos = solicitados.length - permitidos.length;

    // Valores actuales para escribir solo lo que cambió.
    const actualesRes = await client.query(
      `SELECT InscripcionID AS inscripcionid, NumeroParcial AS numeroparcial, Calificacion AS calificacion
         FROM CalificacionParcial
        WHERE InscripcionID = ANY($1::int[])`,
      [[...editables]],
    );
    const actuales = new Map<string, number | null>();
    for (const r of actualesRes.rows) {
      actuales.set(
        `${r.inscripcionid}_${Number(r.numeroparcial)}`,
        r.calificacion === null ? null : Number(r.calificacion),
      );
    }

    const aEscribir = permitidos.filter((c) => {
      const clave = `${c.inscripcionId}_${c.parcial}`;
      if (!actuales.has(clave)) return c.calificacion !== null; // no crear filas vacías
      return actuales.get(clave) !== c.calificacion;
    });

    if (aEscribir.length > 0) {
      await client.query(
        `INSERT INTO CalificacionParcial (InscripcionID, NumeroParcial, Calificacion)
         SELECT x.insc, x.parcial, x.cal
           FROM unnest($1::int[], $2::smallint[], $3::numeric[]) AS x(insc, parcial, cal)
         ON CONFLICT (InscripcionID, NumeroParcial)
         DO UPDATE SET Calificacion = EXCLUDED.Calificacion,
                       FechaRegistro = CURRENT_TIMESTAMP`,
        [
          aEscribir.map((c) => c.inscripcionId),
          aEscribir.map((c) => c.parcial),
          aEscribir.map((c) => c.calificacion),
        ],
      );
    }

    await client.query('COMMIT');

    const nota =
      omitidos > 0
        ? ` ${plural(omitidos, 'celda omitida', 'celdas omitidas')} (alumno en extraordinario o fuera de la materia).`
        : '';

    if (aEscribir.length === 0) {
      return { ok: true, mensaje: `No hubo cambios.${nota}` };
    }
    return {
      ok: true,
      mensaje: `${plural(aEscribir.length, 'calificación guardada', 'calificaciones guardadas')}.${nota}`,
    };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}