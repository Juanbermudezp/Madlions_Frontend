'use server';

import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import type { Cobro, EstadoCobro, ResultadoCobros } from '@/lib/pagos';

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
