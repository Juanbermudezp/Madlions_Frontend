'use server';

import { api, AccesoDenegadoError, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import { MENSAJES_REPORTES, type RangoReporte, type ReporteOcupacion, type Resultado } from '@/lib/reportes';

/**
 * Server Actions de los reportes (Módulo 10). Corren en el servidor de Next,
 * que reenvía el token httpOnly. Si la sesión no es de un ADMINISTRADOR no se
 * llama a la API; quien autoriza de verdad es el backend (403).
 */

async function pedir<T>(ruta: string, rango: RangoReporte, contexto: string): Promise<Resultado<T>> {
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) return { ok: false, error: MENSAJES_REPORTES.sesionExpirada, estado: 401 };
    if (usuario.rol !== 'ADMINISTRADOR') return { ok: false, error: MENSAJES_REPORTES.accesoDenegado, estado: 403 };

    const query = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta });
    return { ok: true, datos: await api<T>(`${ruta}?${query}`) };
  } catch (error) {
    if (error instanceof SesionInvalidaError) return { ok: false, error: MENSAJES_REPORTES.sesionExpirada, estado: 401 };
    if (error instanceof AccesoDenegadoError) return { ok: false, error: MENSAJES_REPORTES.accesoDenegado, estado: 403 };
    // 400: rango inválido; trae el mensaje del backend.
    if (error instanceof ApiError) return { ok: false, error: error.message, estado: error.estado };
    console.error(`Error al consultar ${contexto}:`, error instanceof Error ? error.name : 'desconocido');
    return { ok: false, error: MENSAJES_REPORTES.sinConexion };
  }
}

/** FE-26.1 · Reporte de ocupación de clases grupales (BE-26.1). */
export async function obtenerReporteOcupacion(rango: RangoReporte): Promise<Resultado<ReporteOcupacion>> {
  return pedir<ReporteOcupacion>('reportes/ocupacion', rango, 'el reporte de ocupación');
}
