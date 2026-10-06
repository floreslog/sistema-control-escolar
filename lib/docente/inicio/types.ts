export interface MateriaResumen {
  grupoAsignaturaId: number;
  grupoId: number;
  clave: string;
  nombre: string;
  nombreGrupo: string;
  nombreCiclo: string;
  inscritos: number;
  aprobados: number;
  enCurso: number;
  /** Con parciales completos y sin aprobar: falta enviarlos a extraordinario. */
  porEnviar: number;
  /** Ya enviados a extraordinario, sin calificación capturada. */
  enExtra: number;
  reprobados: number;
  promedio: number | null;
  /** Calificaciones parciales capturadas. */
  capturados: number;
  /** inscritos × número de parciales. */
  esperados: number;
}

export interface ResumenInicio {
  materias: MateriaResumen[];
  ciclos: string[];
  grupos: number;
  alumnos: number;
  promedio: number | null;
  calificacionMinima: number;
}