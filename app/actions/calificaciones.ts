'use server';

import { api, AccesoDenegadoError, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import { MENSAJES_REPORTES, type RangoReporte, type Resultado } from '@/lib/reportes';
import type { Calificaciones } from '@/lib/calificaciones';

/**
 * Server Action del panel de calificaciones (H21, FE-21.1). Corre en el
 * servidor de Next, que reenvía el token httpOnly. Si la sesión no es de un
 * ADMINISTRADOR no se llama a la API; quien autoriza de verdad es el backend.
 */
export async function obtenerCalificaciones(
  rango: RangoReporte,
): Promise<Resultado<Calificaciones>> {
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) {
      return { ok: false, error: MENSAJES_REPORTES.sesionExpirada, estado: 401 };
    }
    if (usuario.rol !== 'ADMINISTRADOR') {
      return { ok: false, error: MENSAJES_REPORTES.accesoDenegado, estado: 403 };
    }

    const query = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta });
    return { ok: true, datos: await api<Calificaciones>(`estadisticas/calificaciones?${query}`) };
  } catch (error) {
    if (error instanceof SesionInvalidaError) {
      return { ok: false, error: MENSAJES_REPORTES.sesionExpirada, estado: 401 };
    }
    if (error instanceof AccesoDenegadoError) {
      return { ok: false, error: MENSAJES_REPORTES.accesoDenegado, estado: 403 };
    }
    // 400: rango inválido; trae el mensaje del backend.
    if (error instanceof ApiError) return { ok: false, error: error.message, estado: error.estado };

    console.error(
      'Error al consultar el panel de calificaciones:',
      error instanceof Error ? error.name : 'desconocido',
    );
    return { ok: false, error: MENSAJES_REPORTES.sinConexion };
  }
}
