'use server';

import { api, ApiError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import { esFecha } from '@/lib/clases';
import { UUID_RUTINA } from '@/lib/rutinas';
import { SIN_PERMISO_PROGRESO, type Filtro, type Resultado, type Serie } from '@/lib/evolucion';

/** BE-14.2 es la autoridad de la relación entrenador-miembro; esta acción solo lee. */
export async function consultarProgresoMiembro(miembroId: string, filtro: Filtro = {}): Promise<Resultado<Serie[]>> {
  if (!UUID_RUTINA.test(miembroId)) return { ok: false, status: 400, error: 'El identificador del miembro no es válido.' };
  if (!filtro || typeof filtro !== 'object' || Array.isArray(filtro)) return { ok: false, status: 400, error: 'Los filtros no son válidos.' };
  if ((filtro.tipo !== undefined && !['PESO', 'CINTURA', 'CADERA', 'PECHO', 'BRAZO', 'MUSLO', 'MARCA'].includes(filtro.tipo))
    || (filtro.desde !== undefined && (typeof filtro.desde !== 'string' || !esFecha(filtro.desde)))
    || (filtro.hasta !== undefined && (typeof filtro.hasta !== 'string' || !esFecha(filtro.hasta)))
    || (filtro.desde && filtro.hasta && filtro.desde > filtro.hasta)) {
    return { ok: false, status: 400, error: 'Revisa el tipo de medición y el rango de fechas.' };
  }
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) return { ok: false, status: 401, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (usuario.rol !== 'ENTRENADOR') return { ok: false, status: 403, error: SIN_PERMISO_PROGRESO };
    const params = new URLSearchParams();
    if (filtro.tipo) params.set('tipo', filtro.tipo);
    if (filtro.desde) params.set('desde', filtro.desde);
    if (filtro.hasta) params.set('hasta', filtro.hasta);
    const respuesta = await api<{ series: Serie[] }>(`miembros/${encodeURIComponent(miembroId)}/progreso?${params}`);
    if (!respuesta || !Array.isArray(respuesta.series)) return { ok: false, error: 'La API devolvió un formato inesperado.' };
    return { ok: true, data: respuesta.series };
  } catch (error) {
    if (error instanceof ApiError) {
      const mensaje = error.estado === 403 ? SIN_PERMISO_PROGRESO
        : error.estado === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
        : error.estado === 400 ? 'Revisa el tipo de medición y el rango de fechas.' : error.message;
      return { ok: false, status: error.estado, error: mensaje };
    }
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
  }
}
