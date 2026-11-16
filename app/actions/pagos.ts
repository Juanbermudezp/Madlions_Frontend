'use server';

import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import type { Cobro, DatosTarjeta, EstadoCobro, RespuestaPago, ResultadoCobros } from '@/lib/pagos';

/**
 * Server Actions de "Mis pagos" (H12). Corren en el servidor de Next, que
 * reenvía el token httpOnly: el backend devuelve solo los cobros del miembro
 * de ese token y decide los permisos.
 */

/** Cobros del miembro autenticado con el estado de la pestaña. */
export async function listarCobros(estado: EstadoCobro): Promise<ResultadoCobros> {
  try {
    return { ok: true, cobros: await api<Cobro[]>(`cobros/mios?estado=${estado}`) };
  } catch (error) {
    if (error instanceof SesionInvalidaError) {
      return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    }
    if (error instanceof ApiError) return { ok: false, error: error.message };
    console.error('Error al consultar los cobros:', error);
    return { ok: false, error: 'No se pudo conectar con el servidor.' };
  }
}

/**
 * Paga un cobro con la pasarela simulada. Los datos de la tarjeta solo se
 * reenvían a la API (que guarda únicamente los últimos 4 dígitos): aquí no se
 * guardan ni se registran en ningún log.
 */
export async function pagarCobro(cobroId: string, tarjeta: DatosTarjeta): Promise<RespuestaPago> {
  try {
    const respuesta = await api<
      { resultado: 'APROBADO'; referencia: string; comprobanteNumero: string } | { resultado: 'RECHAZADO' | 'ERROR'; mensaje: string }
    >(`cobros/${encodeURIComponent(cobroId)}/pagar`, {
      method: 'POST',
      body: {
        titular: tarjeta.titular.trim(),
        numero: tarjeta.numero.replace(/\s/g, ''),
        vencimiento: tarjeta.vencimiento,
        cvv: tarjeta.cvv,
      },
    });
    return { ok: true, ...respuesta };
  } catch (error) {
    if (error instanceof SesionInvalidaError) {
      return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    }
    // 400, 403, 404 y 409 traen un mensaje para el miembro (p. ej. "El cobro ya fue pagado.").
    if (error instanceof ApiError) return { ok: false, error: error.message };
    // Solo se registra el tipo de error, nunca la tarjeta.
    console.error('Error al pagar el cobro:', error instanceof Error ? error.name : 'desconocido');
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
  }
}
