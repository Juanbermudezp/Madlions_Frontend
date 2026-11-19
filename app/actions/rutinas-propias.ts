'use server';

import { api, ApiError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import { UUID_RUTINA } from '@/lib/rutinas';
import { ERROR_CONEXION_RUTINAS, esDetalleRutinaPropia, esResumenRutinaPropia, type ResultadoRutinaPropia, type RutinaPropiaDetalle, type RutinaPropiaResumen } from '@/lib/rutinas-propias';

type Fallo = Extract<ResultadoRutinaPropia<never>, { ok: false }>;

function fallo(error: unknown, noEncontrado: string): Fallo {
  if (error instanceof ApiError) {
    const mensaje = error.estado === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
      : error.estado === 403 ? 'No tienes permiso para consultar estas rutinas.'
      : error.estado === 404 ? noEncontrado
      : error.estado === 400 ? 'Identificador de rutina inválido.'
      : 'No se pudieron consultar las rutinas. Intenta de nuevo.';
    return { ok: false, status: error.estado, error: mensaje };
  }
  return { ok: false, error: ERROR_CONEXION_RUTINAS };
}

async function autorizar(): Promise<Fallo | null> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, status: 401, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  if (usuario.rol !== 'MIEMBRO') return { ok: false, status: 403, error: 'No tienes permiso para consultar estas rutinas.' };
  return null;
}

export async function listarMisRutinas(): Promise<ResultadoRutinaPropia<RutinaPropiaResumen[]>> {
  try {
    const denegado = await autorizar();
    if (denegado) return denegado;
    const datos = await api<unknown>('rutinas/mias');
    if (!Array.isArray(datos) || !datos.every(esResumenRutinaPropia)) {
      return { ok: false, error: 'La respuesta de rutinas no es válida. Intenta de nuevo.' };
    }
    return { ok: true, datos };
  } catch (error) { return fallo(error, 'No se encontró tu perfil de miembro.'); }
}

export async function consultarMiRutina(id: string): Promise<ResultadoRutinaPropia<RutinaPropiaDetalle>> {
  if (typeof id !== 'string' || !UUID_RUTINA.test(id)) {
    return { ok: false, status: 400, error: 'Identificador de rutina inválido.' };
  }
  try {
    const denegado = await autorizar();
    if (denegado) return denegado;
    const datos = await api<unknown>(`rutinas/${encodeURIComponent(id)}`);
    if (!esDetalleRutinaPropia(datos)) return { ok: false, error: 'La respuesta de la rutina no es válida. Intenta de nuevo.' };
    return { ok: true, datos };
  } catch (error) { return fallo(error, 'La rutina no existe o ya no está disponible.'); }
}
