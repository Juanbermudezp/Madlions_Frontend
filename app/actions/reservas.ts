'use server';

import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import {
  lunesDeSemana,
  type ClaseReservable,
  type MiReserva,
  type PestanaReservas,
  type ResultadoCancelacion,
  type ResultadoLista,
  type ResultadoReserva,
  type SemanaReservable,
} from '@/lib/reservas';

/**
 * Server Actions de las reservas (H5). Corren en el servidor de Next, que
 * reenvía el token httpOnly: el miembro sale del token y el backend decide
 * los permisos y todas las reglas de la reserva.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESION_EXPIRADA = 'Tu sesión expiró. Vuelve a iniciar sesión.';

function mensajeDeError(error: unknown, contexto: string): string {
  if (error instanceof SesionInvalidaError) return SESION_EXPIRADA;
  // 400, 403, 404 y 409 traen el motivo para el miembro (p. ej. "La clase está llena").
  if (error instanceof ApiError) return error.message;
  console.error(`Error al ${contexto}:`, error);
  return 'No se pudo conectar con el servidor. Intenta de nuevo.';
}

/** FE-5.1 · Clases reservables de esta semana o de la siguiente. */
export async function listarClasesReservables(
  semana: SemanaReservable,
): Promise<ResultadoLista<ClaseReservable>> {
  try {
    const lunes = lunesDeSemana(semana);
    return { ok: true, datos: await api<ClaseReservable[]>(`clases/reservables?semana=${lunes}`) };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'consultar las clases de la semana') };
  }
}

/** FE-5.1 · Reserva un cupo. El cuerpo solo lleva la clase. */
export async function reservarClase(claseId: string): Promise<ResultadoReserva> {
  if (!UUID.test(claseId)) return { ok: false, error: 'La clase no existe.' };
  try {
    const { id, lugaresDisponibles } = await api<{ id: string; estado: string; lugaresDisponibles: number }>(
      'reservas',
      { method: 'POST', body: { claseId } },
    );
    return { ok: true, id, lugaresDisponibles };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'reservar la clase') };
  }
}

/** FE-5.2 · Reservas propias, por pestaña. */
export async function listarMisReservas(pestana: PestanaReservas): Promise<ResultadoLista<MiReserva>> {
  try {
    return { ok: true, datos: await api<MiReserva[]>(`reservas/mias?estado=${pestana}`) };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'consultar tus reservas') };
  }
}

/**
 * FE-6.1 · Cancela una reserva propia. Sin cuerpo: el backend compara el dueño
 * de la reserva con el token y valida el plazo de 2 horas.
 */
export async function cancelarReserva(reservaId: string): Promise<ResultadoCancelacion> {
  if (!UUID.test(reservaId)) return { ok: false, error: 'La reserva no existe.' };
  try {
    const { lugaresDisponibles } = await api<{ id: string; estado: string; lugaresDisponibles: number }>(
      `reservas/${reservaId}/cancelar`,
      { method: 'POST' },
    );
    return { ok: true, lugaresDisponibles };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'cancelar la reserva') };
  }
}
