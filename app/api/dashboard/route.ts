// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  if (session.rol !== "docente") {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 403 }
    );
  }

  const docenteId = session.id;

  try {
    const kpisResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT GrupoID)::int AS total_grupos,
         COUNT(DISTINCT AlumnoID)::int AS total_alumnos,
         ROUND(COALESCE(AVG(Promedio), 0), 2)::float8 AS promedio_general,
         ROUND(100.0 * SUM(CASE WHEN Estado = 'Aprobado' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1)::float8 AS porcentaje_aprobacion
       FROM vw_ResultadoAsignatura
       WHERE DocenteID = $1`,
      [docenteId]
    );

    const estadosResult = await pool.query(
      `SELECT Estado AS estado, COUNT(*)::int AS total
       FROM vw_ResultadoAsignatura
       WHERE DocenteID = $1
       GROUP BY Estado`,
      [docenteId]
    );

    const materiasResult = await pool.query(
      `SELECT s.NombreAsignatura AS materia,
              COUNT(*)::int AS total_inscritos,
              SUM(CASE WHEN r.Estado = 'Reprobado' THEN 1 ELSE 0 END)::int AS reprobados,
              ROUND(100.0 * SUM(CASE WHEN r.Estado = 'Reprobado' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1)::float8 AS pct_reprobacion
       FROM vw_ResultadoAsignatura r
       JOIN Asignatura s ON s.AsignaturaID = r.AsignaturaID
       WHERE r.DocenteID = $1
       GROUP BY s.NombreAsignatura
       ORDER BY pct_reprobacion DESC`,
      [docenteId]
    );

    return NextResponse.json({
      success: true,
      kpis: kpisResult.rows[0],
      estados: estadosResult.rows,
      materias: materiasResult.rows,
    });
  } catch (error) {
    console.error("Error al consultar dashboard:", error);
    return NextResponse.json(
      { success: false, error: "No se pudieron obtener los datos del dashboard" },
      { status: 500 }
    );
  }
}