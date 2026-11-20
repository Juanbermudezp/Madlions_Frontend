/**
 * Tipos y utilidades de las reservas de clases (H5).
 * Se usan en el servidor y en el navegador: no importan nada del servidor de Next.
 */

import { fechaLocal, horaLocal, hoyLocal, lunesDe, sumarDias, type EstadoClaseVisible } from './clases';

/** Las dos semanas que el miembro puede consultar (BE-5.1). */
export type SemanaReservable = 'actual' | 'siguiente';

/** Lunes (AAAA-MM-DD) de la semana pedida, en hora de El Salvador. */
export function lunesDeSemana(semana: SemanaReservable, ahora: Date = new Date()): string {
  const lunes = lunesDe(hoyLocal(ahora));
  return semana === 'actual' ? lunes : sumarDias(lunes, 7);
}

/** Clase tal como la devuelve GET /clases/reservables. */
export interface ClaseReservable {
  id: string;
  tipo: { id: string; nombre: string };
  entrenador: { id: string; nombre: string };
  inicio: string;
  fin: string;
  lugaresDisponibles: number;
  yaReservada: boolean;
}

export type EstadoReserva = 'CONFIRMADA' | 'CANCELADA_MIEMBRO' | 'CANCELADA_GIMNASIO';
export type PestanaReservas = 'proximas' | 'pasadas';

/** Reserva tal como la devuelve GET /reservas/mias. */
export interface MiReserva {
  id: string;
  clase: {
    id: string;
    tipo: { id: string; nombre: string };
    entrenador: { id: string; nombre: string };
    inicio: string;
    fin: string;
    estado: EstadoClaseVisible;
  };
  estado: EstadoReserva;
  creadaEn: string;
}

export type ResultadoLista<T> = { ok: true; datos: T[] } | { ok: false; error: string };
export type ResultadoReserva =
  | { ok: true; id: string; lugaresDisponibles: number }
  | { ok: false; error: string };
export type ResultadoCancelacion = { ok: true; lugaresDisponibles: number } | { ok: false; error: string };

export const ETIQUETA_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  CONFIRMADA: 'Confirmada',
  CANCELADA_MIEMBRO: 'Cancelada por el miembro',
  CANCELADA_GIMNASIO: 'Cancelada por el gimnasio',
};

/** Verde Confirmada, gris Cancelada por el miembro, rojo Cancelada por el gimnasio (FE-5.2). */
export const COLOR_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  CONFIRMADA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  CANCELADA_MIEMBRO: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  CANCELADA_GIMNASIO: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export const MENSAJES_RESERVAS = {
  sinClases: 'No hay clases programadas para esta semana',
  sinReservas: 'No tienes reservas',
  confirmada: 'Reserva confirmada',
  llena: 'Llena',
  reservada: 'Reservada',
  cancelada: 'Reserva cancelada',
} as const;

/** Partes de una fecha (AAAA-MM-DD) para el bloque de fecha de las tarjetas: "jue", "19", "nov". */
export function partesDeFecha(fecha: string): { diaSemana: string; dia: string; mes: string } {
  const formato = (opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', ...opciones })
      .format(new Date(`${fecha}T12:00:00Z`))
      .replace('.', '');
  return { diaSemana: formato({ weekday: 'short' }), dia: formato({ day: 'numeric' }), mes: formato({ month: 'short' }) };
}

/** Color de la píldora de lugares: verde con lugares, ámbar con 3 o menos, gris si está llena. */
export function colorLugares(n: number): string {
  if (n === 0) return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  if (n <= 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
}

/** "1 lugar disponible" / "5 lugares disponibles". */
export function textoLugares(n: number): string {
  return n === 1 ? '1 lugar disponible' : `${n} lugares disponibles`;
}

/** Agrupa las clases por día (hora de El Salvador), cada día ordenado por hora. */
export function agruparPorDia<T extends { inicio: string }>(clases: T[]): { fecha: string; clases: T[] }[] {
  const dias = new Map<string, T[]>();
  for (const clase of [...clases].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const fecha = fechaLocal(clase.inicio);
    dias.set(fecha, [...(dias.get(fecha) ?? []), clase]);
  }
  return [...dias.entries()].map(([fecha, delDia]) => ({ fecha, clases: delDia }));
}

// ---------------------------------------------------------------------------
// H6 · Cancelación de mi reserva (FE-6.1)
// ---------------------------------------------------------------------------

/** El miembro puede cancelar hasta 2 horas antes del inicio de la clase (S10, BE-6.1). */
export const HORAS_MINIMAS_CANCELACION = 2;
const MS_MINIMOS_CANCELACION = HORAS_MINIMAS_CANCELACION * 60 * 60 * 1000;

/**
 * El botón Cancelar solo aparece en una reserva confirmada cuya clase empieza
 * en 2 horas o más. Es solo para la pantalla: quien decide es el backend.
 */
export function puedeCancelar(reserva: Pick<MiReserva, 'estado' | 'clase'>, ahora: Date = new Date()): boolean {
  return (
    reserva.estado === 'CONFIRMADA' &&
    new Date(reserva.clase.inicio).getTime() - ahora.getTime() >= MS_MINIMOS_CANCELACION
  );
}

/** "¿Cancelar tu reserva de Yoga del 18/11/2026 a las 07:00?" (fecha y hora de El Salvador). */
export function preguntaCancelacion(reserva: Pick<MiReserva, 'clase'>): string {
  const { clase } = reserva;
  const [anio, mes, dia] = fechaLocal(clase.inicio).split('-');
  return `¿Cancelar tu reserva de ${clase.tipo.nombre} del ${dia}/${mes}/${anio} a las ${horaLocal(clase.inicio)}?`;
}
