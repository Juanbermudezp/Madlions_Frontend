/**
 * Tipos y utilidades de los reportes del Módulo 10 (H26 a H29).
 * Se usan en el servidor y en el navegador: no importan nada del servidor de Next.
 * Las reglas del rango son las mismas que valida el backend (BE-26.1).
 */

import { esFecha, hoyLocal, sumarDias } from './clases';

export const DIAS_POR_DEFECTO = 30;
export const MESES_MAXIMOS = 12;

/** Rango de un reporte, ambos días incluidos (AAAA-MM-DD, hora de El Salvador). */
export interface RangoReporte {
  desde: string;
  hasta: string;
}

export const MENSAJES_REPORTES = {
  fechaInvalida: 'Elige una fecha válida.',
  inicioPosterior: 'La fecha de inicio no puede ser posterior a la de fin',
  rangoMaximo: 'El rango máximo es de 12 meses',
  sinOcupacion: 'No hay clases impartidas en este período',
  sesionExpirada: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  accesoDenegado: 'Acceso denegado',
  sinConexion: 'No se pudo conectar con el servidor. Intenta de nuevo.',
} as const;

/** Los últimos 30 días: hoy y los 29 anteriores. */
export function rangoPorDefecto(ahora: Date = new Date()): RangoReporte {
  const hasta = hoyLocal(ahora);
  return { desde: sumarDias(hasta, -(DIAS_POR_DEFECTO - 1)), hasta };
}

/** Suma meses; si el día no existe en el mes destino usa el último (31/01 + 1 mes = 28/02). */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const destino = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimo));
  return destino.toISOString().slice(0, 10);
}

/** Mensaje de error del rango, o null si es válido. Máximo: hasta el día anterior a desde + 12 meses. */
export function validarRango({ desde, hasta }: RangoReporte): string | null {
  if (!esFecha(desde) || !esFecha(hasta)) return MENSAJES_REPORTES.fechaInvalida;
  if (desde > hasta) return MENSAJES_REPORTES.inicioPosterior;
  if (hasta >= sumarMeses(desde, MESES_MAXIMOS)) return MENSAJES_REPORTES.rangoMaximo;
  return null;
}

/** 18/11/2026 */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/** "20/10/2026 al 18/11/2026" */
export function textoRango({ desde, hasta }: RangoReporte): string {
  return desde === hasta ? fechaCorta(desde) : `${fechaCorta(desde)} al ${fechaCorta(hasta)}`;
}

/** "62.5 %" (un decimal, como lo calcula el backend). */
export function textoPorcentaje(valor: number): string {
  return `${valor.toFixed(1)} %`;
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; estado?: number };

// ---------------------------------------------------------------------------
// H26 · Ocupación de clases grupales
// ---------------------------------------------------------------------------

export type EtiquetaOcupacion = 'BAJA' | 'ALTA';

export interface FilaOcupacion {
  tipoClase: { id: string; nombre: string };
  entrenador: { id: string; nombre: string };
  vecesImpartida: number;
  reservasConfirmadas: number;
  cupoTotal: number;
  ocupacion: number;
  etiqueta: EtiquetaOcupacion | null;
}

export interface ReporteOcupacion extends RangoReporte {
  filas: FilaOcupacion[];
}

export const ETIQUETA_OCUPACION: Record<EtiquetaOcupacion, string> = {
  BAJA: 'Baja ocupación',
  ALTA: 'Alta demanda',
};

export const COLOR_ETIQUETA_OCUPACION: Record<EtiquetaOcupacion, string> = {
  BAJA: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30',
  ALTA: 'bg-emerald-50 text-emerald-800 ring-emerald-600/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30',
};

/** Umbrales de las etiquetas (los mismos del backend: BAJA < 30, ALTA >= 90). */
export const UMBRAL_BAJA = 30;
export const UMBRAL_ALTA = 90;

export interface ResumenOcupacion {
  clasesImpartidas: number;
  reservasConfirmadas: number;
  cupoTotal: number;
  /** Reservas confirmadas ÷ cupo total de todo el período, con un decimal. */
  ocupacionGeneral: number;
  alta: number;
  baja: number;
}

/** Totales del período para las tarjetas de resumen. */
export function resumenOcupacion(filas: FilaOcupacion[]): ResumenOcupacion {
  const r = { clasesImpartidas: 0, reservasConfirmadas: 0, cupoTotal: 0, alta: 0, baja: 0 };
  for (const f of filas) {
    r.clasesImpartidas += f.vecesImpartida;
    r.reservasConfirmadas += f.reservasConfirmadas;
    r.cupoTotal += f.cupoTotal;
    if (f.etiqueta === 'ALTA') r.alta++;
    if (f.etiqueta === 'BAJA') r.baja++;
  }
  const ocupacionGeneral = r.cupoTotal > 0 ? Math.round((r.reservasConfirmadas / r.cupoTotal) * 1000) / 10 : 0;
  return { ...r, ocupacionGeneral };
}

export type ColumnaOcupacion =
  | 'tipoClase'
  | 'entrenador'
  | 'vecesImpartida'
  | 'reservasConfirmadas'
  | 'cupoTotal'
  | 'ocupacion';

export interface Orden<C extends string> {
  columna: C;
  direccion: 'asc' | 'desc';
}

/** Ordena las filas por la columna elegida; los empates siguen el orden de la API (mayor ocupación primero). */
export function ordenarOcupacion(filas: FilaOcupacion[], orden: Orden<ColumnaOcupacion>): FilaOcupacion[] {
  const valor = (f: FilaOcupacion): string | number =>
    orden.columna === 'tipoClase'
      ? f.tipoClase.nombre
      : orden.columna === 'entrenador'
        ? f.entrenador.nombre
        : f[orden.columna];
  const signo = orden.direccion === 'asc' ? 1 : -1;
  return filas
    .map((fila, indice) => ({ fila, indice }))
    .sort((a, b) => {
      const va = valor(a.fila);
      const vb = valor(b.fila);
      const comparacion =
        typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return comparacion * signo || a.indice - b.indice;
    })
    .map(({ fila }) => fila);
}

/** Columnas y filas del PDF de ocupación (FE-26.2). */
export function tablaOcupacionPdf(filas: FilaOcupacion[]): { columnas: string[]; filas: string[][] } {
  return {
    columnas: ['Clase', 'Entrenador', 'Veces impartida', 'Reservas confirmadas', 'Cupo total', 'Ocupación', 'Etiqueta'],
    filas: filas.map((f) => [
      f.tipoClase.nombre,
      f.entrenador.nombre,
      String(f.vecesImpartida),
      String(f.reservasConfirmadas),
      String(f.cupoTotal),
      textoPorcentaje(f.ocupacion),
      f.etiqueta ? ETIQUETA_OCUPACION[f.etiqueta] : '',
    ]),
  };
}
