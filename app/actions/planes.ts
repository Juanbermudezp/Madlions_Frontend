'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import type { ResultadoAccion } from '@/lib/clases';
import { campoDelMensajePlan, validarPlan, type DatosPlan } from '@/lib/planes';

/**
 * Server Actions de la administración de planes (H1).
 * Corren en el servidor de Next, que reenvía el token httpOnly al backend.
 * El backend vuelve a validar todo y decide los permisos con @Roles; aquí se
 * revisa la sesión y los datos para responder rápido y con el campo exacto.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verificarAdministrador(): Promise<ResultadoAccion | null> {
  let usuario;
  try {
    usuario = await obtenerUsuario();
  } catch (error) {
    // Backend apagado o inalcanzable: se informa en el formulario, sin error 500.
    return traducirError(error);
  }
  if (!usuario) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  if (usuario.rol !== 'ADMINISTRADOR') return { ok: false, error: 'Acceso denegado' };
  return null;
}

function primerError(errores: Partial<Record<string, string>>): ResultadoAccion | null {
  const [campo, error] = Object.entries(errores)[0] ?? [];
  return campo && error ? { ok: false, error, campo } : null;
}

function traducirError(error: unknown): ResultadoAccion {
  if (error instanceof SesionInvalidaError) {
    return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  }
  if (error instanceof ApiError) {
    return { ok: false, error: error.message, campo: campoDelMensajePlan(error.message) };
  }
  console.error('Error al guardar en la API:', error);
  return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

/**
 * FE-1.1: crea (id = null) o edita un plan. Al editar no se envía el tipo:
 * no se puede cambiar.
 */
export async function guardarPlan(id: string | null, datos: DatosPlan): Promise<ResultadoAccion> {
  const denegado = await verificarAdministrador();
  if (denegado) return denegado;
  if (id !== null && !UUID.test(id)) return { ok: false, error: 'El plan no existe.' };

  const invalido = primerError(validarPlan(datos));
  if (invalido) return invalido;

  const esSetClases = datos.tipo === 'SET_CLASES';
  const comunes = {
    nombre: datos.nombre.trim(),
    precio: Number(datos.precio.trim()),
    beneficios: datos.beneficios.trim(),
    tiposClaseIds: datos.tiposClaseIds,
    ...(esSetClases ? { cantidadClases: Number(datos.cantidadClases.trim()) } : {}),
  };

  try {
    await api(id ? `planes/${id}` : 'planes', {
      method: id ? 'PATCH' : 'POST',
      body: id ? comunes : { ...comunes, tipo: datos.tipo },
    });
  } catch (error) {
    return traducirError(error);
  }

  revalidatePath('/admin/planes');
  return { ok: true, mensaje: 'Plan guardado' };
}

/** FE-1.2: desactiva un plan. */
export async function desactivarPlan(id: string): Promise<ResultadoAccion> {
  const denegado = await verificarAdministrador();
  if (denegado) return denegado;
  if (!UUID.test(id)) return { ok: false, error: 'El plan no existe.' };

  try {
    await api(`planes/${id}/desactivar`, { method: 'PATCH' });
  } catch (error) {
    return traducirError(error);
  }

  revalidatePath('/admin/planes');
  return { ok: true, mensaje: 'Plan desactivado' };
}
