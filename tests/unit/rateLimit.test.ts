import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/db', () => ({ default: { query: vi.fn() } }));

import pool from '@/lib/db';
import {
  checarRateLimitIP,
  registrarIntentoFallido,
  verificarBloqueoCuenta,
} from '@/lib/rateLimit';

const query = pool.query as unknown as Mock;

describe('rate limit por IP (en memoria)', () => {
  afterEach(() => vi.useRealTimers());

  it('permite 10 intentos por minuto y bloquea el 11', () => {
    const ip = '10.0.0.1';
    for (let i = 0; i < 10; i++) {
      expect(checarRateLimitIP(ip).permitido).toBe(true);
    }
    const bloqueado = checarRateLimitIP(ip);
    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.segundosEspera).toBeGreaterThan(0);
    expect(bloqueado.segundosEspera).toBeLessThanOrEqual(60);
  });

  it('cada IP tiene su propio contador', () => {
    for (let i = 0; i < 11; i++) checarRateLimitIP('10.0.0.2');
    expect(checarRateLimitIP('10.0.0.3').permitido).toBe(true);
  });

  it('se libera al pasar la ventana de 1 minuto', () => {
    vi.useFakeTimers();
    const ip = '10.0.0.4';
    for (let i = 0; i < 11; i++) checarRateLimitIP(ip);
    expect(checarRateLimitIP(ip).permitido).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(checarRateLimitIP(ip).permitido).toBe(true);
  });
});

describe('bloqueo de cuenta (base de datos)', () => {
  beforeEach(() => query.mockReset());

  it('al llegar a 5 intentos fallidos fija BloqueadoHasta', async () => {
    query.mockResolvedValueOnce({ rows: [{ intentosfallidos: 5 }] });
    query.mockResolvedValueOnce({ rows: [] });

    await registrarIntentoFallido('Alumno', 'AlumnoID', 1);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('BloqueadoHasta');
  });

  it('con 4 intentos todavía no bloquea', async () => {
    query.mockResolvedValueOnce({ rows: [{ intentosfallidos: 4 }] });

    await registrarIntentoFallido('Alumno', 'AlumnoID', 1);

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reporta bloqueada solo si BloqueadoHasta está en el futuro', async () => {
    query.mockResolvedValueOnce({ rows: [{ bloqueadohasta: new Date(Date.now() + 10 * 60_000) }] });
    const futuro = await verificarBloqueoCuenta('Docente', 'DocenteID', 1);
    expect(futuro.bloqueado).toBe(true);
    expect(futuro.minutosRestantes).toBeGreaterThan(0);

    query.mockResolvedValueOnce({ rows: [{ bloqueadohasta: new Date(Date.now() - 60_000) }] });
    expect((await verificarBloqueoCuenta('Docente', 'DocenteID', 1)).bloqueado).toBe(false);

    query.mockResolvedValueOnce({ rows: [{ bloqueadohasta: null }] });
    expect((await verificarBloqueoCuenta('Docente', 'DocenteID', 1)).bloqueado).toBe(false);
  });
});
