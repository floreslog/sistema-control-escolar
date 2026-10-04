'use server';

import { revalidatePath } from 'next/cache';
import { requireDocente } from '@/lib/docente/requireDocente';
import {
  cancelarEnvio,
  enviarAExtraordinario,
  guardarExtraordinarios,
  type CambioExtra,
} from '@/lib/docente/extraordinarios/mutations';
import { parseCalificacion } from '@/lib/docente/calificaciones/utils';
import type { EstadoAccion } from '@/lib/docente/types';
import { parseId } from '@/lib/docente/utils';

const ERROR_GENERICO = 'Ocurrió un error. Intenta de nuevo.';
const MAX_FILAS = 500;

function refrescar() {
  revalidatePath('/docente', 'layout');
}

/** undefined = inválida, null = vacía, string = 'YYYY-MM-DD' válida. */
function parseFecha(texto: string): string | null | undefined {
  const t = texto.trim();
  if (t === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;

  const d = new Date(`${t}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t) return undefined;

  const anio = Number(t.slice(0, 4));
  if (anio < 2000 || anio > 2100) return undefined;
  return t;
}

export async function enviarAExtraordinarioAction(
  grupoAsignaturaId: number,
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const ga = parseId(grupoAsignaturaId);
  if (!ga) return { ok: false, mensaje: 'Materia inválida.' };

  const ids: number[] = [];
  for (const v of formData.getAll('inscripcionId')) {
    const n = parseId(typeof v === 'string' ? v : null);
    if (!n) return { ok: false, mensaje: 'Datos inválidos.' };
    ids.push(n);
  }

  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return { ok: false, mensaje: 'Selecciona al menos un alumno.' };
  if (unicos.length > MAX_FILAS) return { ok: false, mensaje: 'Demasiados alumnos en el envío.' };

  try {
    const r = await enviarAExtraordinario(session.id, ga, unicos);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('enviarAExtraordinarioAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

export async function guardarExtraordinariosAction(
  grupoAsignaturaId: number,
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const ga = parseId(grupoAsignaturaId);
  if (!ga) return { ok: false, mensaje: 'Materia inválida.' };

  const cambios: CambioExtra[] = [];

  for (const [clave, valor] of formData.entries()) {
    const m = /^cal_(\d+)$/.exec(clave);
    if (!m || typeof valor !== 'string') continue;

    if (cambios.length >= MAX_FILAS) return { ok: false, mensaje: 'Demasiados datos en el envío.' };

    const extraordinarioId = parseId(m[1]);
    if (!extraordinarioId) return { ok: false, mensaje: 'Datos inválidos.' };

    const cal = parseCalificacion(valor);
    if (!cal.ok) {
      return { ok: false, mensaje: 'Hay calificaciones inválidas. Usa números de 0 a 10 con máximo 2 decimales.' };
    }

    const fechaRaw = formData.get(`fecha_${extraordinarioId}`);
    const fecha = parseFecha(typeof fechaRaw === 'string' ? fechaRaw : '');
    if (fecha === undefined) return { ok: false, mensaje: 'Hay fechas de examen inválidas.' };

    cambios.push({ extraordinarioId, calificacion: cal.valor, fecha });
  }

  if (cambios.length === 0) return { ok: false, mensaje: 'No hay datos para guardar.' };

  try {
    const r = await guardarExtraordinarios(session.id, ga, cambios);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('guardarExtraordinariosAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

export async function cancelarEnvioAction(
  grupoAsignaturaId: number,
  extraordinarioId: number,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const ga = parseId(grupoAsignaturaId);
  const ex = parseId(extraordinarioId);
  if (!ga || !ex) return { ok: false, mensaje: 'Datos inválidos.' };

  try {
    const r = await cancelarEnvio(session.id, ga, ex);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('cancelarEnvioAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}