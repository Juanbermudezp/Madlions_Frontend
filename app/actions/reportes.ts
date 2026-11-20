'use server';

import { api, AccesoDenegadoError, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import { MENSAJES_REPORTES, validarRango, type RangoReporte, type ReporteOcupacion, type Resultado } from '@/lib/reportes';
import type { ConceptoCobro } from '@/lib/pagos';
import { CONCEPTOS_INGRESOS, esDetalleIngresos, esReporteIngresos, type DetalleIngresos, type ReporteIngresos } from '@/lib/reportes-ingresos';

/**
 * Server Actions de los reportes (Módulo 10). Corren en el servidor de Next,
 * que reenvía el token httpOnly. Si la sesión no es de un ADMINISTRADOR no se
 * llama a la API; quien autoriza de verdad es el backend (403).
 */

async function pedir<T>(ruta: string, rango: RangoReporte, contexto: string, parametros: Record<string, string> = {}): Promise<Resultado<T>> {
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) return { ok: false, error: MENSAJES_REPORTES.sesionExpirada, estado: 401 };
    if (usuario.rol !== 'ADMINISTRADOR') return { ok: false, error: MENSAJES_REPORTES.accesoDenegado, estado: 403 };

    const query = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta, ...parametros });
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

function errorRangoIngresos(rango: RangoReporte): string | null {
  if (!rango || typeof rango.desde !== 'string' || typeof rango.hasta !== 'string') return MENSAJES_REPORTES.fechaInvalida;
  return validarRango(rango);
}

function falloIngresos(error: Extract<Resultado<never>, { ok: false }>): Extract<Resultado<never>, { ok: false }> {
  return error.estado && error.estado >= 500
    ? { ok: false, estado: error.estado, error: 'El servidor no pudo consultar los ingresos. Intenta de nuevo.' } : error;
}

/** FE-27.1 · Reutiliza autenticación, cliente sin caché y manejo HTTP de H26. */
export async function obtenerReporteIngresos(rango: RangoReporte): Promise<Resultado<ReporteIngresos>> {
  const error = errorRangoIngresos(rango);
  if (error) return { ok: false, error, estado: 400 };
  const res = await pedir<unknown>('reportes/ingresos', rango, 'el reporte de ingresos');
  if (!res.ok) return falloIngresos(res);
  if (!esReporteIngresos(res.datos)) return { ok: false, error: 'La respuesta del reporte de ingresos no es válida.' };
  return { ok: true, datos: res.datos };
}

export async function obtenerDetalleIngresos(concepto: ConceptoCobro, rango: RangoReporte, pagina = 1): Promise<Resultado<DetalleIngresos>> {
  const error = errorRangoIngresos(rango);
  if (error) return { ok: false, error, estado: 400 };
  if (!CONCEPTOS_INGRESOS.includes(concepto)) return { ok: false, error: 'El concepto de ingresos no es válido.', estado: 400 };
  if (!Number.isSafeInteger(pagina) || pagina < 1) return { ok: false, error: 'La página debe ser un entero positivo.', estado: 400 };
  const res = await pedir<unknown>('reportes/ingresos/detalle', rango, 'el detalle de ingresos', { concepto, pagina: String(pagina) });
  if (!res.ok) return falloIngresos(res);
  if (!esDetalleIngresos(res.datos, pagina)) return { ok: false, error: 'La respuesta del detalle de ingresos no es válida.' };
  return { ok: true, datos: res.datos };
}
