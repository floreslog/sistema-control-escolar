'use server';

import { revalidatePath } from 'next/cache';
import { requireDocente } from '@/lib/docente/requireDocente';
import { guardarCalificaciones } from '@/lib/docente/calificaciones/mutations';
import { parseCalificacion } from '@/lib/docente/calificaciones/utils';
import type { CambioCalificacion } from '@/lib/docente/calificaciones/types';
import type { EstadoAccion } from '@/lib/docente/types';
import { parseId } from '@/lib/docente/utils';

const CELDA = /^cal_(\d+)_(\d+)$/;
const MAX_CELDAS = 5000;
const ERROR_GENERICO = 'Ocurrió un error. Intenta de nuevo.';

export async function guardarCalificacionesAction(
  grupoAsignaturaId: number,
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const ga = parseId(grupoAsignaturaId);
  if (!ga) return { ok: false, mensaje: 'Materia inválida.' };

  const cambios: CambioCalificacion[] = [];

  for (const [clave, valor] of formData.entries()) {
    const m = CELDA.exec(clave);
    if (!m || typeof valor !== 'string') continue;

    if (cambios.length >= MAX_CELDAS) return { ok: false, mensaje: 'Demasiados datos en el envío.' };

    const inscripcionId = parseId(m[1]);
    const parcial = parseId(m[2]);
    if (!inscripcionId || !parcial || parcial > 50) return { ok: false, mensaje: 'Datos inválidos.' };

    const parsed = parseCalificacion(valor);
    if (!parsed.ok) {
      return {
        ok: false,
        mensaje: 'Hay calificaciones inválidas. Usa números de 0 a 10 con máximo 2 decimales.',
      };
    }

    cambios.push({ inscripcionId, parcial, calificacion: parsed.valor });
  }

  if (cambios.length === 0) return { ok: false, mensaje: 'No hay calificaciones para guardar.' };

  try {
    const r = await guardarCalificaciones(session.id, ga, cambios);
    if (r.ok) revalidatePath('/docente', 'layout');
    return r;
  } catch (e) {
    console.error('guardarCalificacionesAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}