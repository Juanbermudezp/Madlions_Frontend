/**
 * Tipos y utilidades de la bandeja de avisos (H23, Módulo 9).
 * Se usan en el servidor y en el navegador: no importan nada del servidor de Next.
 */

import { fechaLocal, horaLocal } from './clases';

export type ModuloOrigen = 'MEMBRESIAS' | 'CLASES' | 'SESIONES' | 'PAGOS';
export type EstadoAviso = 'NO_LEIDO' | 'LEIDO';
export type FiltroAvisos = 'todos' | 'no-leidos';

/** Fila de la bandeja tal como la devuelve GET /avisos/mios. */
export interface AvisoResumen {
  id: string;
  titulo: string;
  moduloOrigen: ModuloOrigen;
  creadoEn: string;
  estado: EstadoAviso;
}

/** Aviso completo tal como lo devuelve GET /avisos/:id (ya marcado como leído). */
export interface AvisoDetalle extends AvisoResumen {
  mensaje: string;
  leidoEn: string | null;
}

/** Una página de la bandeja: 20 avisos, del más reciente al más antiguo. */
export interface PaginaAvisos {
  items: AvisoResumen[];
  total: number;
  pagina: number;
}

export type ResultadoPagina = { ok: true; datos: PaginaAvisos } | { ok: false; error: string };
export type ResultadoDetalle = { ok: true; datos: AvisoDetalle } | { ok: false; error: string };
export type ResultadoConteo = { ok: true; noLeidos: number } | { ok: false; error: string };
export type ResultadoMarcarTodos = { ok: true; actualizados: number } | { ok: false; error: string };

export const AVISOS_POR_PAGINA = 20;

/** Cada cuánto se vuelve a pedir el contador del menú (FE-23.2). */
export const INTERVALO_CONTADOR_MS = 30_000;

export const ETIQUETA_MODULO: Record<ModuloOrigen, string> = {
  MEMBRESIAS: 'Membresías',
  CLASES: 'Clases',
  SESIONES: 'Sesiones',
  PAGOS: 'Pagos',
};

export const MENSAJES_AVISOS = {
  vacio: 'No tienes avisos',
  vacioNoLeidos: 'No tienes avisos sin leer',
  todosLeidos: 'Todos tus avisos quedaron como leídos',
  nadaQueMarcar: 'No tenías avisos sin leer',
} as const;

/** "20/11/2026 15:30" en hora de El Salvador. */
export function fechaHoraAviso(instante: string): string {
  const [anio, mes, dia] = fechaLocal(instante).split('-');
  return `${dia}/${mes}/${anio} ${horaLocal(instante)}`;
}

/** Texto de la insignia del menú: vacío en 0 (se oculta) y "99+" desde 100. */
export function textoContador(noLeidos: number): string {
  if (noLeidos <= 0) return '';
  return noLeidos > 99 ? '99+' : String(noLeidos);
}

/** Cantidad de páginas para un total, con un mínimo de 1. */
export function totalPaginas(total: number): number {
  return Math.max(1, Math.ceil(total / AVISOS_POR_PAGINA));
}
