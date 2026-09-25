import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { hashPassword, verificarRespuestaSeguridad } from '@/lib/auth';
import { checarRateLimitIP } from '@/lib/rateLimit';

const schema = z.object({
  rol: z.enum(['docente', 'alumno']),
  identificador: z.string().min(1),
  respuesta: z.string().min(1, 'Responde tu pregunta de seguridad'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() ?? '127.0.0.1';
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimit = checarRateLimitIP(ip);

  if (!rateLimit.permitido) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${rateLimit.segundosEspera} segundos.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }

  const { rol, identificador, respuesta, password } = parsed.data;
  const tabla = rol === 'docente' ? 'Docente' : 'Alumno';
  const columnaIdentificador = rol === 'docente' ? 'NumeroEmpleado' : 'Matricula';
  const columnaId = rol === 'docente' ? 'DocenteID' : 'AlumnoID';

  const result = await pool.query(
    `SELECT ${columnaId} AS id, RespuestaSeguridadHash, Activo
     FROM ${tabla}
     WHERE ${columnaIdentificador} = $1`,
    [identificador]
  );

  const cuenta = result.rows[0];
  const mensajeError = 'La respuesta no coincide con lo que tenemos registrado.';

  if (!cuenta || !cuenta.respuestaseguridadhash) {
    return NextResponse.json({ error: mensajeError }, { status: 400 });
  }

  if (!cuenta.activo) {
    return NextResponse.json({ error: 'Esta cuenta está desactivada.' }, { status: 403 });
  }

  const respuestaValida = await verificarRespuestaSeguridad(respuesta, cuenta.respuestaseguridadhash);

  if (!respuestaValida) {
    return NextResponse.json({ error: mensajeError }, { status: 400 });
  }

  const nuevoHash = await hashPassword(password);

  await pool.query(
    `UPDATE ${tabla}
     SET PasswordHash = $1, IntentosFallidos = 0, BloqueadoHasta = NULL
     WHERE ${columnaId} = $2`,
    [nuevoHash, cuenta.id]
  );

  return NextResponse.json({ success: true });
}