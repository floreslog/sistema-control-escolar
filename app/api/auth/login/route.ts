import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { verifyPassword, createSessionCookie } from '@/lib/auth';
import {
  checarRateLimitIP,
  verificarBloqueoCuenta,
  registrarIntentoFallido,
  reiniciarIntentosFallidos,
} from '@/lib/rateLimit';

const loginSchema = z.object({
  rol: z.enum(['docente', 'alumno']),
  identificador: z.string().min(1, 'Campo requerido'), // NumeroEmpleado o Matricula
  password: z.string().min(1, 'Campo requerido'),
  remember: z.boolean().optional().default(false),
});

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() ?? '127.0.0.1';
}

export async function POST(request: NextRequest) {
  // rate limit por ip
  const ip = getClientIP(request);
  const rateLimit = checarRateLimitIP(ip);

  if (!rateLimit.permitido) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${rateLimit.segundosEspera} segundos.` },
      { status: 429 }
    );
  }

  // validar el body
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rol, identificador, password, remember } = parsed.data;

  const tabla = rol === 'docente' ? 'Docente' : 'Alumno';
  const columnaIdentificador = rol === 'docente' ? 'NumeroEmpleado' : 'Matricula';
  const columnaId = rol === 'docente' ? 'DocenteID' : 'AlumnoID';

  // ir a buscar la cuenta
  const result = await pool.query(
    `SELECT ${columnaId} AS id, PasswordHash, Nombre, Activo
     FROM ${tabla}
     WHERE ${columnaIdentificador} = $1`,
    [identificador]
  );

  const cuenta = result.rows[0];

  // mensaje de error generico: no revelar si la cuenta no existe o si solo la pass es incorrecta
  const mensajeError = 'Usuario o contraseña incorrectos.';

  if (!cuenta) {
    return NextResponse.json({ error: mensajeError }, { status: 401 });
  }

  if (!cuenta.activo) {
    return NextResponse.json({ error: 'Esta cuenta está desactivada.' }, { status: 403 });
  }

  // Verificar bloqueo de cuenta por intentos fallidos
  const bloqueo = await verificarBloqueoCuenta(tabla, columnaId, cuenta.id);
  if (bloqueo.bloqueado) {
    return NextResponse.json(
      { error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${bloqueo.minutosRestantes} minuto(s).` },
      { status: 403 }
    );
  }

  // CASO ESPECIAL: Alumno no tiene contraseña asignada aun
  if (rol === 'alumno' && !cuenta.passwordhash) {
    return NextResponse.json(
      { error: 'crear_password', mensaje: 'Debes crear tu contraseña antes de ingresar.' },
      { status: 428 } // 428 Precondition Required
    );
  }

  // Verificar la contraseña
  const passwordValida = await verifyPassword(password, cuenta.passwordhash);

  if (!passwordValida) {
    await registrarIntentoFallido(tabla, columnaId, cuenta.id);
    return NextResponse.json({ error: mensajeError }, { status: 401 });
  }

  // Login exitoso, se reinicia la cuenta y se crea la session
  await reiniciarIntentosFallidos(tabla, columnaId, cuenta.id);

  await createSessionCookie(
    { id: cuenta.id, rol, nombre: cuenta.nombre },
    remember
  );

  return NextResponse.json({
    success: true,
    rol,
    nombre: cuenta.nombre,
  });
}