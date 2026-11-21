'use server';

import { api, AccesoDenegadoError, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import { MENSAJES_REPORTES, validarRango, type RangoReporte, type Resultado } from '@/lib/reportes';
import { esReporteDesempeno, type ReporteDesempeno } from '@/lib/reportes-desempeno';
import type { Rol } from '@/lib/roles';

/**
 * Server Actions del reporte de desempeño (H29). El administrador ve a todos
 * los entrenadores (FE-29.1); el entrenador, solo a sí mismo (FE-29.2), y su
 * pantalla nunca envía entrenadorId. Quien autoriza de verdad es el backend.
 */
async function pedirDesempeno(rango: RangoReporte, rol: Rol): Promise<Resultado<ReporteDesempeno>> {
  if (!rango || typeof rango.desde !== 'string' || typeof rango.hasta !== 'string') {
    return { ok: false, estado: 400, error: MENSAJES_REPORTES.fechaInvalida };
  }
  const invalido = validarRango(rango);
  if (invalido) return { ok: false, estado: 400, error: invalido };
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) return { ok: false, error: MENSAJES_REPORTES.sesionExpirada, estado: 401 };
    if (usuario.rol !== rol) return { ok: false, error: MENSAJES_REPORTES.accesoDenegado, estado: 403 };

    const query = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta });
    const datos = await api<unknown>(`reportes/desempeno?${query}`);
    if (!esReporteDesempeno(datos)) return { ok: false, error: 'La respuesta del reporte de desempeño no es válida.' };
    return { ok: true, datos };
  } catch (error) {
    if (error instanceof SesionInvalidaError) return { ok: false, error: MENSAJES_REPORTES.sesionExpirada, estado: 401 };
    if (error instanceof AccesoDenegadoError) return { ok: false, error: MENSAJES_REPORTES.accesoDenegado, estado: 403 };
    if (error instanceof ApiError) return { ok: false, error: error.message, estado: error.estado };
    console.error('Error al consultar el reporte de desempeño:', error instanceof Error ? error.name : 'desconocido');
    return { ok: false, error: MENSAJES_REPORTES.sinConexion };
  }
}

/** FE-29.1 · Desempeño de todos los entrenadores (solo ADMINISTRADOR). */
export async function obtenerReporteDesempeno(rango: RangoReporte): Promise<Resultado<ReporteDesempeno>> {
  return pedirDesempeno(rango, 'ADMINISTRADOR');
}

/** FE-29.2 · "Mi desempeño" del entrenador con sesión (sin entrenadorId). */
export async function obtenerMiDesempeno(rango: RangoReporte): Promise<Resultado<ReporteDesempeno>> {
  return pedirDesempeno(rango, 'ENTRENADOR');
}
