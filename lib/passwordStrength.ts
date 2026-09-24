export interface FortalezaPassword {
  porcentaje: number; // 0-100
  etiqueta: 'Muy débil' | 'Débil' | 'Aceptable' | 'Fuerte' | 'Muy fuerte';
  color: string; // clase de Tailwind
}

export function calcularFortaleza(password: string): FortalezaPassword {
  if (password.length === 0) {
    return { porcentaje: 0, etiqueta: 'Muy débil', color: 'bg-gray-300' };
  }

  let puntos = 0;

  // Longitud (hasta 40 puntos)
  puntos += Math.min(password.length * 4, 40);

  // Variedad de caracteres (15 puntos cada uno)
  if (/[a-z]/.test(password)) puntos += 15;
  if (/[A-Z]/.test(password)) puntos += 15;
  if (/[0-9]/.test(password)) puntos += 15;
  if (/[^a-zA-Z0-9]/.test(password)) puntos += 15;

  const porcentaje = Math.min(puntos, 100);

  if (porcentaje < 30) return { porcentaje, etiqueta: 'Muy débil', color: 'bg-red-500' };
  if (porcentaje < 50) return { porcentaje, etiqueta: 'Débil', color: 'bg-orange-500' };
  if (porcentaje < 75) return { porcentaje, etiqueta: 'Aceptable', color: 'bg-yellow-500' };
  if (porcentaje < 90) return { porcentaje, etiqueta: 'Fuerte', color: 'bg-lime-500' };
  return { porcentaje, etiqueta: 'Muy fuerte', color: 'bg-green-600' };
}