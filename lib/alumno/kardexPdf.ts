import {
  PDFDocument,
  StandardFonts,
  rgb,
  type Color,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import {
  esEstadoDefinitivo,
  etiquetaOportunidad,
  formatCalif,
  type Estado,
  type MateriaHistorial,
} from '@/lib/alumno/types';
import type { CicloKardex, DatosKardex } from '@/lib/alumno/kardex';

// configgggggggggg

export const ZONA_HORARIA = 'America/Mexico_City';

const INSTITUCION = {
  nombre: 'FIME',
  area: 'Dirección de Control Escolar',
  leyenda:
    'Documento informativo generado por el sistema de control escolar. Sin el sello de Control Escolar no tiene validez oficial.',
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGEN = 40;
const CONTENIDO_W = PAGE_W - MARGEN * 2; // 532
const LIMITE_INFERIOR = 72; // por debajo de aquí no se dibuja contenido (queda el pie)
const PIE_LINEA_Y = 54;

function hex(color: string): Color {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const COLOR = {
  acento: hex('#1f2328'),
  texto: hex('#1a1d21'),
  suave: hex('#666c73'),
  linea: hex('#dcdfe3'),
  lineaFina: hex('#e9eaec'),
  fondo: hex('#f3f4f6'),
  caja: hex('#f8f9fa'),
  verde: hex('#15803d'),
  rojo: hex('#b91c1c'),
  ambar: hex('#92400e'),
  blanco: rgb(1, 1, 1),
};

type Alineacion = 'izq' | 'centro' | 'der';

interface Columna {
  titulo: string;
  ancho: number;
  align: Alineacion;
}

// Suman 532 = CONTENIDO_W
const COLS: Columna[] = [
  { titulo: 'CLAVE', ancho: 58, align: 'izq' },
  { titulo: 'ASIGNATURA', ancho: 184, align: 'izq' },
  { titulo: 'CRÉD.', ancho: 32, align: 'centro' },
  { titulo: 'GRUPO', ancho: 38, align: 'centro' },
  { titulo: 'CALIF.', ancho: 42, align: 'centro' },
  { titulo: 'OPORTUNIDAD', ancho: 66, align: 'izq' },
  { titulo: 'ESTADO', ancho: 112, align: 'izq' },
];
const PAD_X = 6;

function limpiar(texto: string, fuente: PDFFont): string {
  const soportados = new Set(fuente.getCharacterSet());
  let salida = '';

  for (const ch of texto.replace(/\s+/g, ' ').normalize('NFC')) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && soportados.has(cp)) {
      salida += ch;
      continue;
    }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const cpBase = base.codePointAt(0);
    salida +=
      base.length === 1 && cpBase !== undefined && soportados.has(cpBase)
        ? base
        : '?';
  }

  return salida;
}
function envolver(
  texto: string,
  fuente: PDFFont,
  size: number,
  max: number,
): string[] {
  const ancho = (t: string) => fuente.widthOfTextAtSize(t, size);
  const lineas: string[] = [];
  let actual = '';

  for (const palabra of texto.split(' ').filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ancho(prueba) <= max) {
      actual = prueba;
      continue;
    }

    if (actual) lineas.push(actual);

    if (ancho(palabra) > max) {
      let trozo = '';
      for (const ch of palabra) {
        if (trozo && ancho(trozo + ch) > max) {
          lineas.push(trozo);
          trozo = ch;
        } else {
          trozo += ch;
        }
      }
      actual = trozo;
    } else {
      actual = palabra;
    }
  }

  if (actual) lineas.push(actual);
  return lineas.length > 0 ? lineas : [''];
}

function recortar(
  texto: string,
  fuente: PDFFont,
  size: number,
  max: number,
): string {
  if (fuente.widthOfTextAtSize(texto, size) <= max) return texto;
  let t = texto;
  while (t.length > 1 && fuente.widthOfTextAtSize(`${t}…`, size) > max)
    t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function oportunidadCorta(orden: number): string {
  if (orden <= 1) return 'Ordinario';
  if (orden === 2) return '1ra extra';
  if (orden === 3) return '2da extra';
  return `${orden - 1}ª extra`;
}

function colorEstado(estado: Estado): Color {
  if (estado === 'Aprobado') return COLOR.verde;
  if (estado === 'Reprobado') return COLOR.rojo;
  return COLOR.ambar;
}

/** "Ordinario 5.00 > 1ra extraordinaria 7.50". Solo si hubo extraordinarios. */
function textoRecorrido(m: MateriaHistorial): string | null {
  if (m.extras.length === 0) return null;

  const partes = [`Ordinario ${formatCalif(m.promedio)}`];
  for (const e of m.extras) {
    partes.push(
      `${etiquetaOportunidad(e.orden)} ${e.calificacion === null ? 'pendiente' : formatCalif(e.calificacion)}`,
    );
  }

  return partes.join(' > ');
}

/* ------------------------------------------------------------------ */
/* Generador                                                           */
/* ------------------------------------------------------------------ */

export async function generarKardexPdf(
  datos: DatosKardex,
  opciones: { emitidoEn: Date; zonaHoraria?: string },
): Promise<Uint8Array> {
  const { alumno, resumen } = datos;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const limpio = (t: string) => limpiar(t, regular);

  const emitido = limpio(
    new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: opciones.zonaHoraria,
    }).format(opciones.emitidoEn),
  );

  const paginas: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  /* ---------- primitivas ---------- */

  function escribir(
    p: PDFPage,
    texto: string,
    x: number,
    yy: number,
    o: {
      font?: PDFFont;
      size?: number;
      color?: Color;
      align?: Alineacion;
    } = {},
  ) {
    const font = o.font ?? regular;
    const size = o.size ?? 9;
    const t = limpio(texto);
    let xx = x;
    if (o.align === 'centro') xx = x - font.widthOfTextAtSize(t, size) / 2;
    if (o.align === 'der') xx = x - font.widthOfTextAtSize(t, size);
    p.drawText(t, { x: xx, y: yy, size, font, color: o.color ?? COLOR.texto });
  }

  function escribirEnCelda(
    texto: string,
    colX: number,
    col: Columna,
    yy: number,
    o: { font?: PDFFont; size?: number; color?: Color },
  ) {
    if (col.align === 'centro') {
      escribir(page, texto, colX + col.ancho / 2, yy, {
        ...o,
        align: 'centro',
      });
    } else {
      escribir(page, texto, colX + PAD_X, yy, o);
    }
  }

  function rectRedondeado(
    p: PDFPage,
    x: number,
    yTop: number,
    w: number,
    h: number,
    r: number,
    relleno: Color,
    borde: Color,
  ) {
    const d =
      `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} ` +
      `H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
    p.drawSvgPath(d, {
      x,
      y: yTop,
      color: relleno,
      borderColor: borde,
      borderWidth: 0.8,
    });
  }

  /** Logo inventado: escudo con montañas y sol. `yTop` es el borde superior. */
  function dibujarLogo(p: PDFPage, x: number, yTop: number, tam: number) {
    const s = tam / 48;
    p.drawSvgPath('M24 2 L44 9 V24 C44 35 35 43 24 47 C13 43 4 35 4 24 V9 Z', {
      x,
      y: yTop,
      scale: s,
      color: COLOR.acento,
    });
    p.drawSvgPath('M10 35 L19 20 L24 28 L29 22 L38 35 Z', {
      x,
      y: yTop,
      scale: s,
      color: COLOR.blanco,
    });
    p.drawCircle({
      x: x + 32 * s,
      y: yTop - 14 * s,
      size: 3 * s,
      color: COLOR.blanco,
    });
  }

  /* ---------- encabezados ---------- */

  function encabezadoCompleto(): number {
    const top = PAGE_H - MARGEN;
    dibujarLogo(page, MARGEN, top, 46);
    escribir(page, INSTITUCION.nombre, MARGEN + 58, top - 20, {
      font: bold,
      size: 16,
      color: COLOR.acento,
    });
    escribir(page, INSTITUCION.area, MARGEN + 58, top - 34, {
      size: 9,
      color: COLOR.suave,
    });

    const derecha = PAGE_W - MARGEN;
    escribir(page, 'KARDEX ACADÉMICO', derecha, top - 20, {
      font: bold,
      size: 14,
      color: COLOR.acento,
      align: 'der',
    });
    escribir(page, `Emitido el ${emitido}`, derecha, top - 34, {
      size: 8.5,
      color: COLOR.suave,
      align: 'der',
    });

    const yRegla = top - 56;
    page.drawLine({
      start: { x: MARGEN, y: yRegla },
      end: { x: derecha, y: yRegla },
      thickness: 1.2,
      color: COLOR.acento,
    });
    return yRegla - 18;
  }

  function encabezadoCompacto(): number {
    const top = PAGE_H - MARGEN + 6;
    dibujarLogo(page, MARGEN, top, 22);
    escribir(page, 'Kardex académico', MARGEN + 30, top - 10, {
      font: bold,
      size: 9.5,
      color: COLOR.acento,
    });
    escribir(page, INSTITUCION.nombre, MARGEN + 30, top - 20, {
      size: 7.5,
      color: COLOR.suave,
    });

    const derecha = PAGE_W - MARGEN;
    const quien = recortar(
      limpio(`${alumno.nombreCompleto}  ·  ${alumno.matricula}`),
      regular,
      8.5,
      CONTENIDO_W - 200,
    );
    escribir(page, quien, derecha, top - 14, {
      size: 8.5,
      color: COLOR.suave,
      align: 'der',
    });

    const yRegla = top - 30;
    page.drawLine({
      start: { x: MARGEN, y: yRegla },
      end: { x: derecha, y: yRegla },
      thickness: 0.8,
      color: COLOR.linea,
    });
    return yRegla - 20;
  }

  function nuevaPagina() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    paginas.push(page);
    y = paginas.length === 1 ? encabezadoCompleto() : encabezadoCompacto();
  }

  function asegurar(alto: number) {
    if (y - alto < LIMITE_INFERIOR) nuevaPagina();
  }

  /* ---------- datos del alumno ---------- */

  function cajaAlumno() {
    const filas: [string, string][][] = [
      [
        ['ALUMNO', alumno.nombreCompleto],
        ['MATRÍCULA', alumno.matricula],
      ],
      [
        ['CORREO ELECTRÓNICO', alumno.correo ?? '—'],
        ['FECHA DE NACIMIENTO', alumno.fechaNacimiento ?? '—'],
      ],
      [
        ['PERIODO', datos.periodoTexto],
        ['MATERIAS INCLUIDAS', datos.materiasTexto],
      ],
    ];

    const altoFila = 32;
    const padV = 12;
    const alto = padV * 2 + filas.length * altoFila - 8;
    const x1 = MARGEN + 14;
    const x2 = MARGEN + 14 + 300;
    const maxIzq = 280;
    const maxDer = PAGE_W - MARGEN - 14 - x2;

    rectRedondeado(
      page,
      MARGEN,
      y,
      CONTENIDO_W,
      alto,
      6,
      COLOR.caja,
      COLOR.linea,
    );

    filas.forEach((fila, i) => {
      const filaTop = y - padV - i * altoFila;
      fila.forEach(([etiqueta, valor], j) => {
        const x = j === 0 ? x1 : x2;
        const max = j === 0 ? maxIzq : maxDer;
        escribir(page, etiqueta, x, filaTop - 8, {
          font: bold,
          size: 7,
          color: COLOR.suave,
        });
        escribir(
          page,
          recortar(limpio(valor), bold, 10, max),
          x,
          filaTop - 21,
          { font: bold, size: 10 },
        );
      });
    });

    y -= alto + 24;
  }

  /* ---------- tabla por ciclo ---------- */

  function tituloCiclo(c: CicloKardex, continuacion: boolean) {
    const texto = limpio(`Ciclo ${c.nombreCiclo}`);
    escribir(page, texto, MARGEN, y - 11, {
      font: bold,
      size: 12,
      color: COLOR.acento,
    });

    const etiqueta = continuacion
      ? '(continuación)'
      : c.activo
        ? 'En curso'
        : '';
    if (etiqueta) {
      const w = bold.widthOfTextAtSize(texto, 12);
      escribir(page, etiqueta, MARGEN + w + 8, y - 11, {
        size: 8.5,
        color: COLOR.suave,
      });
    }
    y -= 24;
  }

  function cabeceraTabla() {
    const h = 20;
    page.drawRectangle({
      x: MARGEN,
      y: y - h,
      width: CONTENIDO_W,
      height: h,
      color: COLOR.fondo,
    });

    let x = MARGEN;
    for (const col of COLS) {
      escribirEnCelda(col.titulo, x, col, y - 13, {
        font: bold,
        size: 7,
        color: COLOR.suave,
      });
      x += col.ancho;
    }
    y -= h;
  }

  function fila(c: CicloKardex, m: MateriaHistorial) {
    const [cClave, cAsig, cCred, cGrupo, cCalif, cOport, cEstado] = COLS;
    const lh = 10.5;
    const definitiva = esEstadoDefinitivo(m.estado);

    const lineasClave = envolver(
      limpio(m.clave),
      regular,
      8.5,
      cClave.ancho - PAD_X * 2,
    );
    const lineasNombre = envolver(
      limpio(m.nombre),
      bold,
      8.5,
      cAsig.ancho - PAD_X * 2,
    );
    const recorrido = textoRecorrido(m);
    const lineasRec = recorrido
      ? envolver(limpio(recorrido), italic, 7.5, cAsig.ancho - PAD_X * 2)
      : [];
    const lineasOport = envolver(
      oportunidadCorta(m.oportunidadActual),
      regular,
      8.5,
      cOport.ancho - PAD_X * 2,
    );
    const lineasEstado = envolver(
      limpio(m.estado),
      bold,
      8,
      cEstado.ancho - PAD_X * 2,
    );

    const altoAsig =
      lineasNombre.length * lh +
      lineasRec.length * 9.5 +
      (lineasRec.length ? 1 : 0);
    const alto =
      Math.max(
        lh,
        altoAsig,
        lineasClave.length * lh,
        lineasOport.length * lh,
        lineasEstado.length * 10,
      ) + 12;

    if (y - alto < LIMITE_INFERIOR) {
      nuevaPagina();
      tituloCiclo(c, true);
      cabeceraTabla();
    }

    const base = y - 6 - 7.2;
    let x = MARGEN;

    lineasClave.forEach((l, i) =>
      escribirEnCelda(l, x, cClave, base - i * lh, {
        size: 8.5,
        color: COLOR.suave,
      }),
    );
    x += cClave.ancho;

    lineasNombre.forEach((l, i) =>
      escribirEnCelda(l, x, cAsig, base - i * lh, { font: bold, size: 8.5 }),
    );
    lineasRec.forEach((l, i) =>
      escribirEnCelda(l, x, cAsig, base - lineasNombre.length * lh - i * 9.5, {
        font: italic,
        size: 7.5,
        color: COLOR.suave,
      }),
    );
    x += cAsig.ancho;

    escribirEnCelda(
      m.creditos === null ? '—' : String(m.creditos),
      x,
      cCred,
      base,
      { size: 8.5 },
    );
    x += cCred.ancho;

    escribirEnCelda(m.nombreGrupo, x, cGrupo, base, { size: 8.5 });
    x += cGrupo.ancho;

    escribirEnCelda(
      formatCalif(definitiva ? m.calificacionFinal : null),
      x,
      cCalif,
      base,
      {
        font: bold,
        size: 9.5,
        color: m.estado === 'Reprobado' ? COLOR.rojo : COLOR.texto,
      },
    );
    x += cCalif.ancho;

    lineasOport.forEach((l, i) =>
      escribirEnCelda(l, x, cOport, base - i * lh, { size: 8.5 }),
    );
    x += cOport.ancho;

    lineasEstado.forEach((l, i) =>
      escribirEnCelda(l, x, cEstado, base - i * 10, {
        font: bold,
        size: 8,
        color: colorEstado(m.estado),
      }),
    );

    y -= alto;
    page.drawLine({
      start: { x: MARGEN, y },
      end: { x: MARGEN + CONTENIDO_W, y },
      thickness: 0.6,
      color: COLOR.lineaFina,
    });
  }

  function pieCiclo(c: CicloKardex) {
    const n = c.materias.length;
    const partes = [
      `Promedio del ciclo: ${formatCalif(c.promedio)}`,
      `Créditos aprobados: ${c.creditosAprobados}`,
      `${n} ${n === 1 ? 'materia' : 'materias'}`,
    ];
    escribir(page, partes.join('   ·   '), MARGEN + CONTENIDO_W, y - 13, {
      size: 8,
      color: COLOR.suave,
      align: 'der',
    });
    y -= 34;
  }

  function seccionCiclo(c: CicloKardex) {
    // Título + cabecera + al menos una fila, para no dejar títulos huérfanos.
    asegurar(24 + 20 + 40);
    tituloCiclo(c, false);
    cabeceraTabla();
    for (const m of c.materias) fila(c, m);
    pieCiclo(c);
  }

  /* ---------- resumen y firma ---------- */

  function resumenFinal() {
    asegurar(190);

    escribir(page, 'RESUMEN', MARGEN, y - 9, {
      font: bold,
      size: 9,
      color: COLOR.acento,
    });
    y -= 18;

    const alto = 56;
    rectRedondeado(
      page,
      MARGEN,
      y,
      CONTENIDO_W,
      alto,
      6,
      COLOR.caja,
      COLOR.linea,
    );

    const stats: [string, string][] = [
      [String(resumen.materias), 'Materias'],
      [String(resumen.aprobadas), 'Aprobadas'],
      [
        `${resumen.creditosAprobados} de ${resumen.creditosTotales}`,
        'Créditos aprobados',
      ],
      [formatCalif(resumen.promedioGeneral), 'Promedio general'],
    ];
    const anchoCol = (CONTENIDO_W - 28) / stats.length;
    stats.forEach(([valor, etiqueta], i) => {
      const x = MARGEN + 14 + i * anchoCol;
      escribir(page, valor, x, y - 26, {
        font: bold,
        size: 16,
        color: COLOR.acento,
      });
      escribir(page, etiqueta, x, y - 41, { size: 7.5, color: COLOR.suave });
    });
    y -= alto + 14;

    const extras: string[] = [];
    if (resumen.enProceso > 0)
      extras.push(`En curso o pendientes: ${resumen.enProceso}.`);
    if (resumen.reprobadas > 0)
      extras.push(`Reprobadas: ${resumen.reprobadas}.`);
    const nota = envolver(
      limpio(
        `El promedio considera únicamente las materias con resultado definitivo (aprobadas y reprobadas). ${extras.join(' ')}`.trim(),
      ),
      italic,
      7.5,
      CONTENIDO_W,
    );
    nota.forEach((l, i) =>
      escribir(page, l, MARGEN, y - 8 - i * 9.5, {
        font: italic,
        size: 7.5,
        color: COLOR.suave,
      }),
    );
    y -= nota.length * 9.5 + 22;

    // Sello (círculo) y línea de firma
    page.drawCircle({
      x: MARGEN + 36,
      y: y - 30,
      size: 28,
      borderColor: COLOR.linea,
      borderWidth: 0.8,
    });
    escribir(page, 'SELLO', MARGEN + 36, y - 33, {
      size: 7,
      color: COLOR.suave,
      align: 'centro',
    });

    const xFin = PAGE_W - MARGEN;
    const xIni = xFin - 200;
    page.drawLine({
      start: { x: xIni, y: y - 44 },
      end: { x: xFin, y: y - 44 },
      thickness: 0.8,
      color: COLOR.suave,
    });
    escribir(page, 'Firma de Control Escolar', (xIni + xFin) / 2, y - 56, {
      size: 8,
      color: COLOR.suave,
      align: 'centro',
    });
    y -= 70;
  }

  /* ---------- pie de página (necesita el total de páginas) ---------- */

  function pies() {
    const leyenda = envolver(limpio(INSTITUCION.leyenda), regular, 7, 410);
    paginas.forEach((p, i) => {
      p.drawLine({
        start: { x: MARGEN, y: PIE_LINEA_Y },
        end: { x: PAGE_W - MARGEN, y: PIE_LINEA_Y },
        thickness: 0.6,
        color: COLOR.linea,
      });
      leyenda.forEach((l, k) =>
        escribir(p, l, MARGEN, PIE_LINEA_Y - 12 - k * 9, {
          size: 7,
          color: COLOR.suave,
        }),
      );
      escribir(
        p,
        `Página ${i + 1} de ${paginas.length}`,
        PAGE_W - MARGEN,
        PIE_LINEA_Y - 12,
        {
          size: 8,
          color: COLOR.suave,
          align: 'der',
        },
      );
    });
  }

  /* ---------- armado ---------- */

  nuevaPagina();
  cajaAlumno();
  for (const c of datos.ciclos) seccionCiclo(c);
  resumenFinal();
  pies();

  pdf.setTitle(limpio(`Kardex académico - ${alumno.nombreCompleto}`));
  pdf.setAuthor(INSTITUCION.nombre);
  pdf.setSubject(`Kardex de la matrícula ${alumno.matricula}`);
  pdf.setCreator('Sistema de control escolar');
  pdf.setProducer('Sistema de control escolar');
  pdf.setCreationDate(opciones.emitidoEn);

  return pdf.save();
}
