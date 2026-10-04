/** El docente tiene acceso a ese grupo: lo registró o imparte una materia en él. */
export const accesoGrupo = (g: string) =>
  `(${g}.DocenteID = $1 OR EXISTS (
      SELECT 1 FROM Grupo_Asignatura gax
       WHERE gax.GrupoID = ${g}.GrupoID AND gax.DocenteID = $1
    ))`;

/**
 * "Alumno mío": pertenece a un grupo que yo registré, o está inscrito en una
 * materia que yo imparto. Define quién puede verse y a quién se le puede
 * restablecer la contraseña.
 */
export const ES_MIO = `(
  EXISTS (
    SELECT 1
      FROM Grupo_Alumno gm
      JOIN Grupo gg ON gg.GrupoID = gm.GrupoID
     WHERE gm.AlumnoID = a.AlumnoID AND gg.DocenteID = $1 AND gg.Activo = TRUE
  )
  OR EXISTS (
    SELECT 1
      FROM Inscripcion im
      JOIN Grupo_Asignatura gam ON gam.GrupoAsignaturaID = im.GrupoAsignaturaID
      JOIN Grupo gg2 ON gg2.GrupoID = gam.GrupoID
     WHERE im.AlumnoID = a.AlumnoID AND gam.DocenteID = $1 AND gg2.Activo = TRUE
  )
)`;