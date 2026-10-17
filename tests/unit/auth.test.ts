import { describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import {
  hashPassword,
  hashRespuestaSeguridad,
  signSession,
  verificarRespuestaSeguridad,
  verifyPassword,
  verifySession,
} from '@/lib/auth';

const SECRETO = new TextEncoder().encode(process.env.JWT_SECRET);

describe('contraseñas (hash bcrypt)', () => {
  it('no guarda texto plano y verifica la correcta', async () => {
    const hash = await hashPassword('Clave-Segura-123');
    expect(hash).not.toContain('Clave-Segura-123');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPassword('Clave-Segura-123', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('Clave-Segura-123');
    expect(await verifyPassword('clave-segura-123', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });
});

describe('respuesta de seguridad', () => {
  it('ignora mayúsculas y espacios en los extremos', async () => {
    const hash = await hashRespuestaSeguridad('Saltillo');
    expect(await verificarRespuestaSeguridad('  saltillo ', hash)).toBe(true);
    expect(await verificarRespuestaSeguridad('SALTILLO', hash)).toBe(true);
  });

  it('rechaza una respuesta distinta', async () => {
    const hash = await hashRespuestaSeguridad('saltillo');
    expect(await verificarRespuestaSeguridad('monterrey', hash)).toBe(false);
  });
});

describe('sesión JWT', () => {
  it('firma y verifica devolviendo id, rol y nombre', async () => {
    const token = await signSession({ id: 7, rol: 'docente', nombre: 'Ana' }, false);
    expect(await verifySession(token)).toMatchObject({ id: 7, rol: 'docente', nombre: 'Ana' });
  });

  it('rechaza un token con el payload alterado (escalada de rol)', async () => {
    const token = await signSession({ id: 7, rol: 'alumno', nombre: 'Ana' }, false);
    const [cabecera, , firma] = token.split('.');
    const falso = Buffer.from(
      JSON.stringify({ id: 7, rol: 'docente', nombre: 'Ana', exp: 9_999_999_999 }),
    ).toString('base64url');

    expect(await verifySession(`${cabecera}.${falso}.${firma}`)).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const otro = new TextEncoder().encode('otro-secreto-distinto-0123456789abcdef');
    const token = await new SignJWT({ id: 1, rol: 'docente', nombre: 'X' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(otro);

    expect(await verifySession(token)).toBeNull();
  });

  it('rechaza un token vencido', async () => {
    const vencido = await new SignJWT({ id: 1, rol: 'docente', nombre: 'X' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(SECRETO);

    expect(await verifySession(vencido)).toBeNull();
  });

  it('rechaza basura', async () => {
    expect(await verifySession('no-es-un-jwt')).toBeNull();
    expect(await verifySession('')).toBeNull();
  });
});
