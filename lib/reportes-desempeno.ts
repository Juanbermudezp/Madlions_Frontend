/**
 * H29 · Reporte de desempeño de entrenadores. Tipos y utilidades que usan el
 * servidor y el navegador (no importan nada del servidor de Next).
 */

import { textoPorcentaje, type Orden, type RangoReporte } from './reportes';

export const SIN_DATOS_SUFICIENTES = 'Sin datos suficientes';
export const MENSAJE_SIN_ENTRENADORES = 'No hay entrenadores registrados';

export interface FilaDesempeno {
  entrenador: { id: string; nombre: string };
  clasesImpartidas: number;
  /** Fórmula de H26; null sin clases impartidas. */
  ocupacionPromedio: number | null;
  sesionesRealizadas: number;
  /** Un decimal; null con menos de 3 reseñas (H21). */
  calificacion: number | null;
  resenas: number;
}

export interface ReporteDesempeno extends RangoReporte {
  filas: FilaDesempeno[];
}

const esNumeroONulo = (v: unknown) => v === null || typeof v === 'number';

/** Valida la forma de la respuesta de GET /reportes/desempeno. */
export function esReporteDesempeno(valor: unknown): valor is ReporteDesempeno {
  if (!valor || typeof valor !== 'object') return false;
  const r = valor as Record<string, unknown>;
  if (typeof r.desde !== 'string' || typeof r.hasta !== 'string' || !Array.isArray(r.filas)) return false;
  return r.filas.every((f: unknown) => {
    if (!f || typeof f !== 'object') return false;
    const x = f as Record<string, unknown>;
    const e = x.entrenador as Record<string, unknown> | null;
    return (
      !!e &&
      typeof e.id === 'string' &&
      typeof e.nombre === 'string' &&
      typeof x.clasesImpartidas === 'number' &&
      esNumeroONulo(x.ocupacionPromedio) &&
      typeof x.sesionesRealizadas === 'number' &&
      esNumeroONulo(x.calificacion) &&
      typeof x.resenas === 'number'
    );
  });
}

/** "4.3" o "Sin datos suficientes". */
export function textoCalificacion(calificacion: number | null): string {
  return calificacion === null ? SIN_DATOS_SUFICIENTES : calificacion.toFixed(1);
}

/** "62.5 %" o "—" sin clases impartidas. */
export function textoOcupacion(ocupacion: number | null): string {
  return ocupacion === null ? '—' : textoPorcentaje(ocupacion);
}

export type ColumnaDesempeno = 'entrenador' | 'clasesImpartidas' | 'ocupacionPromedio' | 'sesionesRealizadas' | 'calificacion';

/**
 * Ordena por la columna elegida, de mayor a menor o al revés. Los valores
 * nulos ("Sin datos suficientes", sin clases) van siempre al final; los
 * empates se desempatan por nombre.
 */
export function ordenarDesempeno(filas: FilaDesempeno[], orden: Orden<ColumnaDesempeno>): FilaDesempeno[] {
  const signo = orden.direccion === 'asc' ? 1 : -1;
  const porNombre = (a: FilaDesempeno, b: FilaDesempeno) => a.entrenador.nombre.localeCompare(b.entrenador.nombre, 'es');
  return [...filas].sort((a, b) => {
    if (orden.columna === 'entrenador') return porNombre(a, b) * signo;
    const va = a[orden.columna];
    const vb = b[orden.columna];
    if (va === null && vb === null) return porNombre(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va - vb) * signo || porNombre(a, b);
  });
}

/** Columnas y filas del PDF (FE-26.2). */
export function tablaDesempenoPdf(filas: FilaDesempeno[]): { columnas: string[]; filas: string[][] } {
  return {
    columnas: ['Entrenador', 'Clases impartidas', 'Ocupación promedio', 'Sesiones realizadas', 'Calificación', 'Reseñas'],
    filas: filas.map((f) => [
      f.entrenador.nombre,
      String(f.clasesImpartidas),
      textoOcupacion(f.ocupacionPromedio),
      String(f.sesionesRealizadas),
      textoCalificacion(f.calificacion),
      String(f.resenas),
    ]),
  };
}

/** La calificación (1 a 5) llevada a la escala de la ocupación (0 a 100) para la gráfica: × 20. */
export function calificacionEscalada(calificacion: number | null): number | null {
  return calificacion === null ? null : Math.round(calificacion * 20 * 10) / 10;
}
