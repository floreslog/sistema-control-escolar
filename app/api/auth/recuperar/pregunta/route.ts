import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { checarRateLimitIP } from '@/lib/rateLimit';

const schema = z.object({
  rol: z.enum(['docente', 'alumno']),
  identificador: z.string().min(1),
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
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { rol, identificador } = parsed.data;
  const tabla = rol === 'docente' ? 'Docente' : 'Alumno';
  const columnaIdentificador = rol === 'docente' ? 'NumeroEmpleado' : 'Matricula';

  const result = await pool.query(
    `SELECT PreguntaSeguridad FROM ${tabla} WHERE ${columnaIdentificador} = $1`,
    [identificador]
  );

  const cuenta = result.rows[0];

  // no negar ni confirmar que la cuenta existe, mensaje generico
  if (!cuenta || !cuenta.preguntaseguridad) {
    return NextResponse.json(
      { error: 'No encontramos una pregunta de seguridad configurada para esos datos.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ pregunta: cuenta.preguntaseguridad });
}