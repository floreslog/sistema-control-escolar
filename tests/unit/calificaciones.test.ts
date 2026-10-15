import { describe, expect, it } from 'vitest';
import { formatearCalif, parseCalificacion } from '@/lib/docente/calificaciones/utils';
import { esEstadoDefinitivo, etiquetaOportunidad, formatCalif } from '@/lib/alumno/types';

describe('parseCalificacion (escala 0-100)', () => {
  it('celda vacía es pendiente (null), nunca 0', () => {
    expect(parseCalificacion('')).toEqual({ ok: true, valor: null });
    expect(parseCalificacion('   ')).toEqual({ ok: true, valor: null });
  });

  it('el 0 escrito es un 0 real, no pendiente', () => {
    expect(parseCalificacion('0')).toEqual({ ok: true, valor: 0 });
  });

  it.each([
    ['70', 70],
    ['100', 100],
    ['85.5', 85.5],
    ['85,5', 85.5], // coma decimal
    ['99.99', 99.99],
  ])('acepta "%s"', (texto, esperado) => {
    expect(parseCalificacion(texto)).toEqual({ ok: true, valor: esperado });
  });

  it.each(['101', '100.01', '1000', '-1', 'abc', '85.555', '8 5', '10,'])(
    'rechaza "%s"',
    (texto) => {
      expect(parseCalificacion(texto)).toEqual({ ok: false });
    },
  );
});

describe('formato de calificaciones', () => {
  it('formatearCalif (captura): enteros sin decimales', () => {
    expect(formatearCalif(90)).toBe('90');
    expect(formatearCalif(85.5)).toBe('85.5');
    expect(formatearCalif(83.333)).toBe('83.33');
    expect(formatearCalif(null)).toBe('');
  });

  it('formatCalif (alumno): igual, pero null se muestra como raya', () => {
    expect(formatCalif(90)).toBe('90');
    expect(formatCalif(83.333)).toBe('83.33');
    expect(formatCalif(null)).toBe('—');
    expect(formatCalif(undefined)).toBe('—');
    expect(formatCalif(Number.NaN)).toBe('—');
  });
});

describe('estados y oportunidades', () => {
  it('solo Aprobado y Reprobado son definitivos', () => {
    expect(esEstadoDefinitivo('Aprobado')).toBe(true);
    expect(esEstadoDefinitivo('Reprobado')).toBe(true);
    expect(esEstadoDefinitivo('En curso')).toBe(false);
    expect(esEstadoDefinitivo('En extraordinario')).toBe(false);
    expect(esEstadoDefinitivo('Pendiente siguiente extraordinario')).toBe(false);
  });

  it('etiquetas de oportunidad', () => {
    expect(etiquetaOportunidad(1)).toBe('Ordinario');
    expect(etiquetaOportunidad(2)).toBe('1ra extraordinaria');
    expect(etiquetaOportunidad(3)).toBe('2da extraordinaria');
  });
});
