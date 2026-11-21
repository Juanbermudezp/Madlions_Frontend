'use server';

import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import type {
  AvisoDetalle,
  FiltroAvisos,
  PaginaAvisos,
  ResultadoConteo,
  ResultadoDetalle,
  ResultadoMarcarTodos,
  ResultadoPagina,
} from '@/lib/avisos';

/**
 * Server Actions de la bandeja de avisos (H23). Corren en el servidor de Next,
 * que reenvía el token httpOnly: el miembro sale del token y el backend solo
 * devuelve sus propios avisos.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESION_EXPIRADA = 'Tu sesión expiró. Vuelve a iniciar sesión.';

function mensajeDeError(error: unknown, contexto: string): string {
  if (error instanceof SesionInvalidaError) return SESION_EXPIRADA;
  // 400, 403 y 404 traen el motivo (p. ej. "No tienes permiso para ver este recurso.").
  if (error instanceof ApiError) return error.message;
  console.error(`Error al ${contexto}:`, error);
  return 'No se pudo conectar con el servidor. Intenta de nuevo.';
}

/** FE-23.1 · Una página de la bandeja (20 avisos), con o sin el filtro de no leídos. */
export async function listarMisAvisos(pagina: number, filtro: FiltroAvisos): Promise<ResultadoPagina> {
  const numero = Number.isInteger(pagina) && pagina >= 1 ? pagina : 1;
  const soloNoLeidos = filtro === 'no-leidos';
  try {
    return {
      ok: true,
      datos: await api<PaginaAvisos>(`avisos/mios?pagina=${numero}&soloNoLeidos=${soloNoLeidos}`),
    };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'consultar tus avisos') };
  }
}

/** FE-23.1 · Abre un aviso: trae el mensaje completo y el backend lo marca como leído. */
export async function abrirAviso(avisoId: string): Promise<ResultadoDetalle> {
  if (!UUID.test(avisoId)) return { ok: false, error: 'El aviso no existe.' };
  try {
    return { ok: true, datos: await api<AvisoDetalle>(`avisos/${avisoId}`) };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'abrir el aviso') };
  }
}

/** FE-23.2 · Cantidad de avisos sin leer para la insignia del menú. */
export async function contarAvisosNoLeidos(): Promise<ResultadoConteo> {
  try {
    const { noLeidos } = await api<{ noLeidos: number }>('avisos/no-leidos/conteo');
    return { ok: true, noLeidos };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'contar tus avisos') };
  }
}

/** FE-23.1 · Marca como leídos todos los avisos del miembro. Sin cuerpo. */
export async function marcarTodosLeidos(): Promise<ResultadoMarcarTodos> {
  try {
    const { actualizados } = await api<{ actualizados: number }>('avisos/marcar-todos-leidos', {
      method: 'POST',
    });
    return { ok: true, actualizados };
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, 'marcar tus avisos como leídos') };
  }
}
