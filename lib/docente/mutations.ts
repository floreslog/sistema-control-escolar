import pool from '@/lib/db';
import { plural } from '@/lib/docente/utils';

export interface Resultado {
  ok: boolean;
  mensaje: string;
}

function esViolacionUnica(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}

export async function crearGrupo(
  docenteId: number,
  datos: { nombreGrupo: string; semestre: number | null; turno: string | null; cicloId: number },
): Promise<{ ok: true; grupoId: number } | { ok: false; mensaje: string }> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO Grupo (DocenteID, NombreGrupo, Semestre, Turno, CicloID)
       SELECT $1::int, $2::varchar, $3::int, $4::varchar, ci.CicloID
         FROM CicloEscolar ci
        WHERE ci.CicloID = $5 AND ci.Activo = TRUE
       RETURNING GrupoID AS grupoid`,
      [docenteId, datos.nombreGrupo, datos.semestre, datos.turno, datos.cicloId],
    );

    if (rows.length === 0) return { ok: false, mensaje: 'El ciclo seleccionado no está disponible.' };
    return { ok: true, grupoId: rows[0].grupoid as number };
  } catch (e) {
    if (esViolacionUnica(e)) {
      return { ok: false, mensaje: 'Ya tienes un grupo con ese nombre en ese ciclo.' };
    }
    throw e;
  }
}

export async function agregarAlumnosAGrupo(
  docenteId: number,
  grupoId: number,
  alumnoIds: number[],
): Promise<Resultado> {
  const dueno = await pool.query(
    `SELECT 1 FROM Grupo WHERE GrupoID = $1 AND DocenteID = $2 AND Activo = TRUE`,
    [grupoId, docenteId],
  );
  if (dueno.rowCount === 0) return { ok: false, mensaje: 'Grupo no encontrado.' };

  const r = await pool.query(
    `INSERT INTO Grupo_Alumno (GrupoID, AlumnoID)
     SELECT g.GrupoID, a.AlumnoID
       FROM Grupo g
       JOIN Alumno a ON a.AlumnoID = ANY($3::int[])
      WHERE g.GrupoID = $1 AND g.DocenteID = $2 AND g.Activo = TRUE AND a.Activo = TRUE
     ON CONFLICT (GrupoID, AlumnoID) DO NOTHING`,
    [grupoId, docenteId, alumnoIds],
  );

  const agregados = r.rowCount ?? 0;
  const omitidos = alumnoIds.length - agregados;

  if (agregados === 0) {
    return { ok: false, mensaje: 'No se agregó ningún alumno (ya estaban en el grupo o no están activos).' };
  }

  return {
    ok: true,
    mensaje:
      `${plural(agregados, 'alumno agregado', 'alumnos agregados')} al grupo.` +
      (omitidos > 0 ? ` ${plural(omitidos, 'se omitió', 'se omitieron')} (ya estaban o inactivos).` : ''),
  };
}

export async function quitarAlumnoDeGrupo(
  docenteId: number,
  grupoId: number,
  alumnoId: number,
): Promise<Resultado> {
  // Solo si es titular y el alumno NO está inscrito en ninguna materia del grupo.
  const r = await pool.query(
    `DELETE FROM Grupo_Alumno gal
      USING Grupo g
      WHERE gal.GrupoID = $1
        AND gal.AlumnoID = $3
        AND g.GrupoID = gal.GrupoID
        AND g.DocenteID = $2
        AND NOT EXISTS (
          SELECT 1
            FROM Inscripcion i
            JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID
           WHERE ga.GrupoID = $1 AND i.AlumnoID = $3
        )`,
    [grupoId, docenteId, alumnoId],
  );

  if ((r.rowCount ?? 0) === 0) {
    return {
      ok: false,
      mensaje: 'No se pudo quitar. Si está inscrito en materias, primero quítalo de ellas.',
    };
  }
  return { ok: true, mensaje: 'Alumno quitado del grupo.' };
}

export async function agregarMateriaAGrupo(
  docenteId: number,
  grupoId: number,
  asignaturaId: number,
): Promise<Resultado> {
  try {
    // El docente que imparte la materia es el titular (sesión).
    const r = await pool.query(
      `INSERT INTO Grupo_Asignatura (GrupoID, AsignaturaID, DocenteID)
       SELECT g.GrupoID, s.AsignaturaID, g.DocenteID
         FROM Grupo g
         JOIN Asignatura s ON s.AsignaturaID = $3 AND s.Activo = TRUE
        WHERE g.GrupoID = $1 AND g.DocenteID = $2 AND g.Activo = TRUE`,
      [grupoId, docenteId, asignaturaId],
    );

    if ((r.rowCount ?? 0) === 0) return { ok: false, mensaje: 'No se pudo agregar la materia.' };
    return { ok: true, mensaje: 'Materia agregada al grupo.' };
  } catch (e) {
    if (esViolacionUnica(e)) return { ok: false, mensaje: 'Esa materia ya está en el grupo.' };
    throw e;
  }
}

export async function quitarMateriaDeGrupo(
  docenteId: number,
  grupoId: number,
  grupoAsignaturaId: number,
): Promise<Resultado> {
  const r = await pool.query(
    `DELETE FROM Grupo_Asignatura ga
      USING Grupo g
      WHERE ga.GrupoAsignaturaID = $3
        AND ga.GrupoID = $1
        AND g.GrupoID = ga.GrupoID
        AND g.DocenteID = $2
        AND NOT EXISTS (
          SELECT 1 FROM Inscripcion i WHERE i.GrupoAsignaturaID = ga.GrupoAsignaturaID
        )`,
    [grupoId, docenteId, grupoAsignaturaId],
  );

  if ((r.rowCount ?? 0) === 0) {
    return { ok: false, mensaje: 'No se pudo quitar. Primero desinscribe a todos los alumnos de la materia.' };
  }
  return { ok: true, mensaje: 'Materia quitada del grupo.' };
}

/**
 * Deja la lista de inscritos de una materia exactamente como la marcó el docente:
 *  - agrega a los marcados que no estaban inscritos,
 *  - quita a los desmarcados que no tienen calificaciones,
 *  - NUNCA quita a quien ya tiene parciales/extraordinarios (se conserva).
 * Solo funciona si el docente imparte esa materia, y solo con alumnos que
 * pertenecen al grupo.
 */
export async function sincronizarInscripciones(
  docenteId: number,
  grupoId: number,
  grupoAsignaturaId: number,
  alumnoIds: number[],
): Promise<Resultado> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verifica que imparte la materia y bloquea la fila para serializar guardados simultáneos.
    const permiso = await client.query(
      `SELECT ga.GrupoAsignaturaID
         FROM Grupo_Asignatura ga
         JOIN Grupo g ON g.GrupoID = ga.GrupoID
        WHERE ga.GrupoAsignaturaID = $1
          AND ga.GrupoID = $2
          AND ga.DocenteID = $3
          AND g.Activo = TRUE
        FOR UPDATE OF ga`,
      [grupoAsignaturaId, grupoId, docenteId],
    );
    if (permiso.rowCount === 0) {
      await client.query('ROLLBACK');
      return { ok: false, mensaje: 'Materia no encontrada.' };
    }

    // Solo alumnos que pertenecen al grupo.
    const validos = await client.query(
      `SELECT AlumnoID AS alumnoid FROM Grupo_Alumno
        WHERE GrupoID = $1 AND AlumnoID = ANY($2::int[])`,
      [grupoId, alumnoIds],
    );
    const deseados = new Set<number>(validos.rows.map((r) => Number(r.alumnoid)));

    const actuales = await client.query(
      `SELECT
          i.InscripcionID AS inscripcionid,
          i.AlumnoID      AS alumnoid,
          (
            EXISTS (SELECT 1 FROM CalificacionParcial cp
                     WHERE cp.InscripcionID = i.InscripcionID AND cp.Calificacion IS NOT NULL)
            OR EXISTS (SELECT 1 FROM Extraordinario e WHERE e.InscripcionID = i.InscripcionID)
          ) AS tienecalificaciones
         FROM Inscripcion i
        WHERE i.GrupoAsignaturaID = $1`,
      [grupoAsignaturaId],
    );

    const yaInscritos = new Set<number>(actuales.rows.map((r) => Number(r.alumnoid)));
    const aAgregar = [...deseados].filter((id) => !yaInscritos.has(id));
    const aQuitar = actuales.rows
      .filter((r) => !deseados.has(Number(r.alumnoid)) && !r.tienecalificaciones)
      .map((r) => Number(r.inscripcionid));

    if (aAgregar.length > 0) {
      await client.query(
        `INSERT INTO Inscripcion (AlumnoID, GrupoAsignaturaID)
         SELECT unnest($1::int[]), $2::int`,
        [aAgregar, grupoAsignaturaId],
      );
    }

    if (aQuitar.length > 0) {
      // Solo hay parciales vacíos (sin calificación): se limpian antes de borrar.
      await client.query(`DELETE FROM CalificacionParcial WHERE InscripcionID = ANY($1::int[])`, [aQuitar]);
      await client.query(`DELETE FROM Inscripcion WHERE InscripcionID = ANY($1::int[])`, [aQuitar]);
    }

    await client.query('COMMIT');

    if (aAgregar.length === 0 && aQuitar.length === 0) {
      return { ok: true, mensaje: 'No hubo cambios.' };
    }

    const partes: string[] = [];
    if (aAgregar.length) partes.push(`${plural(aAgregar.length, 'inscrito', 'inscritos')}`);
    if (aQuitar.length) partes.push(`${plural(aQuitar.length, 'dado de baja', 'dados de baja')}`);
    return { ok: true, mensaje: `Guardado: ${partes.join(', ')}.` };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}