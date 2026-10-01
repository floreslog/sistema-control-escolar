'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireDocente } from '@/lib/docente/requireDocente';
import {
  agregarAlumnosAGrupo,
  agregarMateriaAGrupo,
  crearGrupo,
  quitarAlumnoDeGrupo,
  quitarMateriaDeGrupo,
  sincronizarInscripciones,
} from '@/lib/docente/mutations';
import type { EstadoAccion } from '@/lib/docente/types';

/**
 * endpoints POST públicos: cada una vuelve a verificar
 * la sesión y valida TODO lo que llega 
 */

const ERROR_GENERICO = 'Ocurrió un error. Intenta de nuevo.';
const id = z.coerce.number().int().positive().max(2147483647);

function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Datos inválidos.';
}

function refrescar() {
  revalidatePath('/docente/grupos', 'layout');
}

// --- Crear grupo ---

const nuevoGrupoSchema = z.object({
  nombreGrupo: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre del grupo.')
    .max(50, 'El nombre del grupo no puede pasar de 50 caracteres.'),
  semestre: z.string().trim().regex(/^(\d{1,2})?$/, 'El semestre debe ser un número.'),
  turno: z.enum(['', 'Matutino', 'Vespertino'], { error: 'Turno inválido.' }),
  cicloId: id.catch(0).pipe(z.number().positive('Selecciona un ciclo escolar.')),
});

export async function crearGrupoAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const valores = {
    nombreGrupo: String(formData.get('nombreGrupo') ?? ''),
    semestre: String(formData.get('semestre') ?? ''),
    turno: String(formData.get('turno') ?? ''),
    cicloId: String(formData.get('cicloId') ?? ''),
  };

  const parsed = nuevoGrupoSchema.safeParse(valores);
  if (!parsed.success) return { ok: false, mensaje: primerError(parsed.error), valores };

  const semestre = parsed.data.semestre === '' ? null : Number(parsed.data.semestre);
  if (semestre !== null && (semestre < 1 || semestre > 20)) {
    return { ok: false, mensaje: 'El semestre debe estar entre 1 y 20.', valores };
  }

  let resultado;
  try {
    resultado = await crearGrupo(session.id, {
      nombreGrupo: parsed.data.nombreGrupo,
      semestre,
      turno: parsed.data.turno === '' ? null : parsed.data.turno,
      cicloId: parsed.data.cicloId,
    });
  } catch (e) {
    console.error('crearGrupoAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO, valores };
  }

  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje, valores };

  refrescar();
  redirect(`/docente/grupos/${resultado.grupoId}`); // fuera del try: redirect lanza una excepción interna
}

// --- Agregar alumnos al grupo ---

const alumnosSchema = z
  .array(id)
  .min(1, 'Selecciona al menos un alumno.')
  .max(200, 'Máximo 200 alumnos por envío.');

export async function agregarAlumnosAction(
  grupoId: number,
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const g = id.safeParse(grupoId);
  const a = alumnosSchema.safeParse(formData.getAll('alumnoId'));
  if (!g.success) return { ok: false, mensaje: 'Grupo inválido.' };
  if (!a.success) return { ok: false, mensaje: primerError(a.error) };

  try {
    const r = await agregarAlumnosAGrupo(session.id, g.data, [...new Set(a.data)]);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('agregarAlumnosAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

// --- Quitar alumno del grupo ---

export async function quitarAlumnoAction(grupoId: number, alumnoId: number): Promise<EstadoAccion> {
  const session = await requireDocente();

  const g = id.safeParse(grupoId);
  const a = id.safeParse(alumnoId);
  if (!g.success || !a.success) return { ok: false, mensaje: 'Datos inválidos.' };

  try {
    const r = await quitarAlumnoDeGrupo(session.id, g.data, a.data);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('quitarAlumnoAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

// --- Agregar / quitar materia del grupo ---

export async function agregarMateriaAction(
  grupoId: number,
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const g = id.safeParse(grupoId);
  const s = id.safeParse(formData.get('asignaturaId'));
  if (!g.success) return { ok: false, mensaje: 'Grupo inválido.' };
  if (!s.success) return { ok: false, mensaje: 'Selecciona una materia.' };

  try {
    const r = await agregarMateriaAGrupo(session.id, g.data, s.data);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('agregarMateriaAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

export async function quitarMateriaAction(
  grupoId: number,
  grupoAsignaturaId: number,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const g = id.safeParse(grupoId);
  const ga = id.safeParse(grupoAsignaturaId);
  if (!g.success || !ga.success) return { ok: false, mensaje: 'Datos inválidos.' };

  try {
    const r = await quitarMateriaDeGrupo(session.id, g.data, ga.data);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('quitarMateriaAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

// --- Guardar inscripciones de una materia ---

const inscripcionesSchema = z.array(id).max(500, 'Demasiados alumnos.');

export async function guardarInscripcionesAction(
  grupoId: number,
  grupoAsignaturaId: number,
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const session = await requireDocente();

  const g = id.safeParse(grupoId);
  const ga = id.safeParse(grupoAsignaturaId);
  const a = inscripcionesSchema.safeParse(formData.getAll('alumnoId'));
  if (!g.success || !ga.success) return { ok: false, mensaje: 'Datos inválidos.' };
  if (!a.success) return { ok: false, mensaje: primerError(a.error) };

  try {
    const r = await sincronizarInscripciones(session.id, g.data, ga.data, [...new Set(a.data)]);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    console.error('guardarInscripcionesAction:', e);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}