export const ESTADOS = [
  'En curso',
  'Pendiente de extraordinario',
  'En extraordinario',
  'Pendiente siguiente extraordinario',
  'Aprobado',
  'Reprobado',
] as const;

export type Estado = (typeof ESTADOS)[number];

//Un estado es definitivo cuando la materia ya no puede cambiar de resultado
export function esEstadoDefinitivo(estado: Estado): boolean {
  return estado === 'Aprobado' || estado === 'Reprobado';
}

//formatear calificacion (escala 0-100): enteros sin decimales, el resto hasta 2
export function formatCalif(n: number | null | undefined): string {
  return n === null || n === undefined || Number.isNaN(n) ? '—' : String(Number(n.toFixed(2)));
}

// Orden 1 = ordinario, 2 = 1ra extra, 3 = 2da extra
export function etiquetaOportunidad(orden: number): string {
  if (orden <= 1) return 'Ordinario';
  if (orden === 2) return '1ra extraordinaria';
  if (orden === 3) return '2da extraordinaria';
  return `${orden - 1}ª extraordinaria`;
}

export interface Perfil {
  alumnoId: number;
  matricula: string;
  nombreCompleto: string;
}

export interface Parametros {
  calificacionMinima: number;
  numParciales: number;
}


export interface MateriaBase {
  inscripcionId: number;
  cicloId: number;
  nombreCiclo: string;
  nombreGrupo: string;
  clave: string;
  nombre: string;
  creditos: number | null;
  parcialesCapturados: number;
  
  promedio: number | null;
  oportunidadActual: number;
  nombreOportunidad: string;
 
  calificacionFinal: number | null;
  estado: Estado;
}

export interface MateriaActual extends MateriaBase {
  
  parciales: (number | null)[];
}

export interface Extraordinario {
  orden: number;
  nombreOportunidad: string;
  calificacion: number | null;
  
  fechaExamen: string | null;
}

export interface MateriaHistorial extends MateriaBase {
  extras: Extraordinario[];
}

export interface CicloResumen {
  cicloId: number;
  nombreCiclo: string;
  activo: boolean;
  materias: number;
  creditosAprobados: number;
  promedio: number | null;
}

export interface Resumen {
  promedioGeneral: number | null;
  creditosAprobados: number;
  creditosInscritos: number;
  totalMaterias: number;
  materiasAprobadas: number;
  porEstado: { estado: Estado; total: number }[];
}