export interface ParametrosCalif {
  calificacionMinima: number;
  numParciales: number;
}

/** Materia que el docente imparte, para la lista de captura. */
export interface MateriaCalificable {
  grupoAsignaturaId: number;
  grupoId: number;
  clave: string;
  nombre: string;
  nombreGrupo: string;
  nombreCiclo: string;
  cicloActivo: boolean;
  inscritos: number;
  /** Calificaciones capturadas por parcial (índice 0 = P1). */
  capturados: number[];
}

export interface MateriaCaptura {
  grupoAsignaturaId: number;
  grupoId: number;
  clave: string;
  nombre: string;
  nombreGrupo: string;
  nombreCiclo: string;
  /** Solo se captura en ciclos activos. */
  editable: boolean;
}

export interface AlumnoCaptura {
  inscripcionId: number;
  matricula: string;
  nombreCompleto: string;
  /** Una posición por parcial; null = aún no capturado. */
  parciales: (number | null)[];
  promedio: number | null;
  estado: string;
  /** Ya tiene extraordinario: el ordinario queda cerrado. */
  bloqueado: boolean;
}

export interface CambioCalificacion {
  inscripcionId: number;
  parcial: number;
  calificacion: number | null;
}