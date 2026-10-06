export interface MateriaRef {
  grupoAsignaturaId: number;
  clave: string;
  nombre: string;
  nombreGrupo: string;
  nombreCiclo: string;
}

/** Alumno que ya puede ser enviado a (otra) oportunidad extraordinaria. */
export interface AlumnoPorEnviar {
  inscripcionId: number;
  matricula: string;
  nombreCompleto: string;
  promedio: number | null;
  estado: string;
  /** Nombre de la oportunidad a la que pasaría (ej. "Primera Extraordinaria"). */
  siguienteOportunidad: string;
}

/** Última oportunidad extraordinaria registrada de una inscripción. */
export interface AlumnoExtra {
  extraordinarioId: number;
  inscripcionId: number;
  matricula: string;
  nombreCompleto: string;
  oportunidad: string;
  calificacion: number | null;
  /** 'YYYY-MM-DD' o '' si no hay fecha. */
  fechaExamen: string;
  estado: string;
}

export interface BloqueMateria<T> {
  materia: MateriaRef;
  alumnos: T[];
}

export interface DatosExtraordinarios {
  porEnviar: BloqueMateria<AlumnoPorEnviar>[];
  captura: BloqueMateria<AlumnoExtra>[];
  calificacionMinima: number;
}