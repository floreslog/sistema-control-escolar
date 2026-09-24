import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { hashPassword, createSessionCookie } from '@/lib/auth';

const schema = z.object({
  matricula: z.string().min(1, 'Campo requerido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { matricula, password } = parsed.data;

  // busca el alumno y confirma que aun no tiene contraseña
  const result = await pool.query(
    `SELECT AlumnoID, Nombre, PasswordHash, Activo
     FROM Alumno
     WHERE Matricula = $1`,
    [matricula]
  );

  const alumno = result.rows[0];

  if (!alumno) {
    return NextResponse.json({ error: 'Matrícula no encontrada.' }, { status: 404 });
  }

  if (!alumno.activo) {
    return NextResponse.json({ error: 'Esta cuenta está desactivada.' }, { status: 403 });
  }

  if (alumno.passwordhash) {
    //si ya tiene contraseña decirle que debe recuperarla
    return NextResponse.json(
      { error: 'Esta cuenta ya tiene una contraseña. Usa la opción de recuperarla si la olvidaste.' },
      { status: 409 }
    );
  }

  const hash = await hashPassword(password);

  await pool.query(
    `UPDATE Alumno SET PasswordHash = $1 WHERE AlumnoID = $2`,
    [hash, alumno.alumnoid]
  );

  // cuando cree su contraseña se le logea automaticamente
  await createSessionCookie(
    { id: alumno.alumnoid, rol: 'alumno', nombre: alumno.nombre },
    false
  );

  return NextResponse.json({ success: true, nombre: alumno.nombre });
}