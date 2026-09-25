import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = 'session';

export type Rol = 'docente' | 'alumno';

export interface SessionPayload {
  id: number;
  rol: Rol;
  nombre: string;
}

//hasheo

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

//jwt

export async function signSession(payload: SessionPayload, remember: boolean): Promise<string> {
  const expiration = remember ? '30d' : '1d';
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// --- Cookie helpers (solo usar dentro de Server Actions / Route Handlers) ---

export async function createSessionCookie(payload: SessionPayload, remember: boolean) {
  const token = await signSession(payload, remember);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Si "remember" es true, la cookie va a durar 30 dias
    // Si es false, es solo una cookie de sesion, se va a borrar cuando cierre el navegador
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export { COOKIE_NAME };

// preguntas de seguridad para recuperar contrasenia

function normalizarRespuesta(respuesta: string): string {
  return respuesta.trim().toLowerCase();
}

export async function hashRespuestaSeguridad(respuesta: string): Promise<string> {
  return bcrypt.hash(normalizarRespuesta(respuesta), 10);
}

export async function verificarRespuestaSeguridad(respuesta: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalizarRespuesta(respuesta), hash);
}