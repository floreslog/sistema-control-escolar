import { describe, expect, it } from 'vitest';
import { calcularFortaleza } from '@/lib/passwordStrength';

describe('calcularFortaleza', () => {
  it('vacía = 0% y Muy débil', () => {
    expect(calcularFortaleza('')).toMatchObject({ porcentaje: 0, etiqueta: 'Muy débil' });
  });

  it.each([
    ['abc', 'Muy débil'],
    ['password', 'Débil'],
    ['Password1', 'Fuerte'],
    ['Abcdef12!x', 'Muy fuerte'],
  ])('"%s" => %s', (password, etiqueta) => {
    expect(calcularFortaleza(password).etiqueta).toBe(etiqueta);
  });

  it('nunca pasa de 100%', () => {
    expect(calcularFortaleza('Aa1!'.repeat(20)).porcentaje).toBe(100);
  });

  it('agregar variedad no baja la fortaleza', () => {
    expect(calcularFortaleza('Password1!').porcentaje).toBeGreaterThanOrEqual(
      calcularFortaleza('Password1').porcentaje,
    );
  });
});
