export interface FiltroAlumnosDocente {
  q: string;
  /** 0 = todos los grupos. */
  grupoId: number;
  pagina: number;
}

export interface AlumnoLista {
  alumnoId: number;
  matricula: string;
  nombreCompleto: string;
  activo: boolean;
  /** Ej: "3B · 2026-2". Solo grupos a los que el docente tiene acceso. */
  grupos: string[];
  /** PasswordHash NULL: el alumno aún debe crear su contraseña. */
  sinContrasena: boolean;
}

export interface AlumnoPerfil {
  alumnoId: number;
  matricula: string;
  nombreCompleto: string;
  correo: string | null;
  activo: boolean;
  sinContrasena: boolean;
  grupos: string[];
}

export interface MateriaKardex {
  inscripcionId: number;
  nombreCiclo: string;
  nombreGrupo: string;
  clave: string;
  nombre: string;
  creditos: number | null;
  /** Una posición por parcial; null = no capturado. */
  parciales: (number | null)[];
  promedio: number | null;
  calificacionFinal: number | null;
  /** Nombre de la oportunidad vigente o de aprobación (ej. "Ordinario"). */
  oportunidad: string;
  oportunidadActual: number;
  estado: string;
}

export interface AlumnoDetalle {
  perfil: AlumnoPerfil;
  kardex: MateriaKardex[];
  numParciales: number;
  calificacionMinima: number;
}