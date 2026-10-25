export function fechaParaNombre(fecha: Date, timeZone?: string): string {
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(fecha);

  const valor = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('day')}-${valor('month')}-${valor('year')}`;
}

//  "Kardex 24-10-2026 - Luis Fernando Flores Sánchez.pdf"
export function nombreArchivoKardex(
  alumno: string,
  fecha: Date,
  timeZone?: string,
): string {
  const limpio = Array.from(alumno)
    .filter((ch) => ch.charCodeAt(0) >= 32 && !'\\/:*?"<>|'.includes(ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  return `Kardex ${fechaParaNombre(fecha, timeZone)} - ${limpio || 'Alumno'}.pdf`;
}
