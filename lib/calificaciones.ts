/**
 * Tipos y utilidades del panel de calificaciones (H21).
 * Se usan en el servidor y en el navegador: no importan nada del servidor de
 * Next. El rango lo comparte con los reportes del Módulo 10 (lib/reportes).
 */

export const SIN_DATOS_SUFICIENTES = 'Sin datos suficientes';
export const MINIMO_RESENAS = 3;

export const PESTANAS = ['entrenadores', 'tiposClase'] as const;

export type Pestana = (typeof PESTANAS)[number];

export const ETIQUETA_PESTANA: Record<Pestana, string> = {
  entrenadores: 'Entrenadores',
  tiposClase: 'Clases',
};

/** Una fila del panel: un entrenador o un tipo de clase. */
export interface PromedioCalificacion {
  id: string;
  nombre: string;
  /** Null cuando el aspecto tiene menos de 3 reseñas en el rango. */
  promedio: number | null;
  total: number;
}

/** Respuesta de GET /estadisticas/calificaciones. */
export interface Calificaciones {
  desde: string;
  hasta: string;
  entrenadores: PromedioCalificacion[];
  tiposClase: PromedioCalificacion[];
  instalaciones: { promedio: number | null; total: number };
}

export type Direccion = 'asc' | 'desc';

/**
 * Ordena por promedio. Las filas sin promedio van siempre al final, en las dos
 * direcciones: no tienen un valor con el que compararse, y dejarlas arriba al
 * ordenar de menor a mayor taparía lo que el administrador está buscando.
 * Entre ellas, y entre las empatadas, se ordena por nombre.
 */
export function ordenarPorPromedio(
  filas: PromedioCalificacion[],
  direccion: Direccion,
): PromedioCalificacion[] {
  const signo = direccion === 'asc' ? 1 : -1;

  return [...filas].sort((a, b) => {
    if (a.promedio === null && b.promedio === null) return a.nombre.localeCompare(b.nombre);
    if (a.promedio === null) return 1;
    if (b.promedio === null) return -1;
    if (a.promedio !== b.promedio) return (a.promedio - b.promedio) * signo;
    return a.nombre.localeCompare(b.nombre);
  });
}

/** "4.5" con un decimal siempre, para que la columna quede alineada. */
export function textoPromedio(promedio: number): string {
  return promedio.toFixed(1);
}

/** Cuántas estrellas se pintan llenas: el promedio redondeado al entero. */
export function estrellasLlenas(promedio: number): number {
  return Math.min(5, Math.max(0, Math.round(promedio)));
}

/** "8 reseñas", "1 reseña", "Sin reseñas". */
export function textoResenas(total: number): string {
  if (total === 0) return 'Sin reseñas';
  return total === 1 ? '1 reseña' : `${total} reseñas`;
}
