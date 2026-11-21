'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import type { ResultadoAccion } from '@/lib/clases';
import { AREA_POR_ROL } from '@/lib/roles';
import {
  campoDelMensajeCambio,
  ESTADO_ACTUALIZADO,
  pideFechaEstimada,
  validarCambioEstado,
  type DatosCambioEstado,
} from '@/lib/maquinas';

/**
 * Cambio de estado de una máquina (H18, FE-18.1). Corre en el servidor de
 * Next, que reenvía el token httpOnly. El backend vuelve a validar todo y
 * decide los permisos con @Roles; acá se revisa para responder rápido y con
 * el campo exacto.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function traducirError(error: unknown): ResultadoAccion {
  if (error instanceof SesionInvalidaError) {
    return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  }
  if (error instanceof ApiError) {
    return { ok: false, error: error.message, campo: campoDelMensajeCambio(error.message) };
  }
  console.error('Error al cambiar el estado de una máquina:', error);
  return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

export async function cambiarEstadoMaquina(
  id: string,
  datos: DatosCambioEstado,
): Promise<ResultadoAccion> {
  let usuario;
  try {
    usuario = await obtenerUsuario();
  } catch (error) {
    return traducirError(error);
  }

  if (!usuario) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  // Supuesto S13: el entrenador también cambia el estado, porque es quien
  // detecta las fallas en el piso.
  if (usuario.rol !== 'ADMINISTRADOR' && usuario.rol !== 'ENTRENADOR') {
    return { ok: false, error: 'Acceso denegado' };
  }
  if (!UUID.test(id)) return { ok: false, error: 'La máquina no existe.' };

  const errores = validarCambioEstado(datos);
  const [campo, error] = Object.entries(errores)[0] ?? [];
  if (campo && error) return { ok: false, error, campo };

  const fecha = datos.fechaEstimadaRetorno.trim();

  try {
    await api(`maquinas/${id}/estado`, {
      method: 'POST',
      body: {
        estado: datos.estado,
        motivo: datos.motivo.trim(),
        // Al volver a OPERATIVA no se manda fecha: el backend la rechaza.
        ...(fecha && pideFechaEstimada(datos.estado) ? { fechaEstimadaRetorno: fecha } : {}),
      },
    });
  } catch (e) {
    return traducirError(e);
  }

  const area = AREA_POR_ROL[usuario.rol];
  revalidatePath(`${area}/equipo`);
  revalidatePath(`${area}/equipo/${id}`);
  return { ok: true, mensaje: ESTADO_ACTUALIZADO };
}
