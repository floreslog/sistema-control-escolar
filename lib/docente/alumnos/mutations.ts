import pool from '@/lib/db';
import { ES_MIO } from '@/lib/docente/alumnos/sql';
import type { Resultado } from '@/lib/docente/mutations';

export async function restablecerContrasena(
  docenteId: number,
  alumnoId: number,
): Promise<Resultado> {
  const r = await pool.query(
    `UPDATE Alumno a
        SET PasswordHash = NULL,
            IntentosFallidos = 0,
            BloqueadoHasta = NULL
      WHERE a.AlumnoID = $2
        AND a.Activo = TRUE
        AND a.PasswordHash IS NOT NULL
        AND ${ES_MIO}`,
    [docenteId, alumnoId],
  );

  if ((r.rowCount ?? 0) === 0) {
    return {
      ok: false,
      mensaje: 'No se pudo restablecer: el alumno no está disponible o ya está pendiente de crear su contraseña.',
    };
  }

  // No hay tabla de auditoría: al menos queda rastro en el log del servidor.
  console.info(`[auditoría] docente ${docenteId} restableció la contraseña del alumno ${alumnoId}`);

  return {
    ok: true,
    mensaje: 'Contraseña restablecida. El alumno deberá crear una nueva al iniciar sesión.',
  };
}