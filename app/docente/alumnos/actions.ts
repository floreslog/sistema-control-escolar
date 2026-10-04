'use server';

import { revalidatePath } from 'next/cache';
import { requireDocente } from '@/lib/docente/requireDocente';
import { restablecerContrasena } from '@/lib/docente/alumnos/mutations';
import type { EstadoAccion } from '@/lib/docente/types';
import { parseId } from '@/lib/docente/utils';

/**
 * Endpoint POST público: se vuelve a verificar la sesión y se valida el id.
 * El DocenteID sale de la sesión; que el alumno sea "suyo" se comprueba en BD.
 */
export async function restablecerContrasenaAction(alumnoId: number): Promise<EstadoAccion> {
  const session = await requireDocente();

  const id = parseId(alumnoId);
  if (!id) return { ok: false, mensaje: 'Alumno inválido.' };

  try {
    const r = await restablecerContrasena(session.id, id);
    if (r.ok) revalidatePath('/docente/alumnos', 'layout');
    return r;
  } catch (e) {
    console.error('restablecerContrasenaAction:', e);
    return { ok: false, mensaje: 'Ocurrió un error. Intenta de nuevo.' };
  }
}