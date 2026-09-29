import pool from '@/lib/db';
import { requireDocente } from '@/lib/docente/requireDocente';

export interface PerfilDocente {
  nombreCompleto: string;
  numeroEmpleado: string;
}

//devuelve null si el docente no existe o está inactivo.
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