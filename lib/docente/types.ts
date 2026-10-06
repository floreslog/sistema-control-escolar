export type EstadoAccion = {
  ok: boolean;
  mensaje: string;
  valores?: Record<string, string>;
} | null;

export interface GrupoResumen {
  grupoId: number;
  nombreGrupo: string;
  semestre: number | null;
  turno: string | null;
  nombreCiclo: string;
  cicloActivo: boolean;
  esDueno: boolean;
  totalAlumnos: number;
  totalMaterias: number;
}

export interface GrupoBasico {
  grupoId: number;
  nombreGrupo: string;
  semestre: number | null;
  turno: string | null;
  nombreCiclo: string;
  esDueno: boolean;
}

export interface MateriaGrupo {
  grupoAsignaturaId: number;
  asignaturaId: number;
  clave: string;
  nombre: string;
  creditos: number | null;
  /** true si el docente en sesión es quien imparte esta materia. */
  puedoGestionar: boolean;
  inscritos: number;
}

export interface AlumnoGrupo {
  alumnoId: number;
  matricula: string;
  nombreCompleto: string;
  /** GrupoAsignaturaID de las materias del grupo en las que está inscrito. */
  materias: number[];
}

export interface GrupoDetalle extends GrupoBasico {
  materias: MateriaGrupo[];
  alumnos: AlumnoGrupo[];
}

export interface AlumnoCatalogo {
  alumnoId: number;
  matricula: string;
  nombreCompleto: string;
}

export interface FiltroAlumnos {
  q: string;
  soloSinGrupo: boolean;
  pagina: number;
}

export interface CicloOpcion {
  cicloId: number;
  nombreCiclo: string;
}

export interface AsignaturaOpcion {
  asignaturaId: number;
  clave: string;
  nombre: string;
}

export interface MateriaInscripciones {
  grupoAsignaturaId: number;
  grupoId: number;
  clave: string;
  nombre: string;
  nombreGrupo: string;
  nombreCiclo: string;
}

export interface AlumnoInscripcion {
  alumnoId: number;
  matricula: string;
  nombreCompleto: string;
  inscrito: boolean;
  /** Si ya tiene parciales o extraordinarios capturados no se puede dar de baja. */
  tieneCalificaciones: boolean;
}