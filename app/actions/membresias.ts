'use server';

import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import {
  MENSAJE_REGISTRADA,
  validarBusqueda,
  type MiembroEncontrado,
  type Resultado,
  type ResumenOperacion,
} from '@/lib/membresias';

/**
 * Server Actions del registro de compras y renovaciones (H2).
 * Corren en el servidor de Next, que reenvía el token httpOnly al backend.
 * El backend vuelve a validar todo y decide los permisos con @Roles; aquí se
 * revisa la sesión para responder rápido con un mensaje claro.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verificarRecepcion(): Promise<{ ok: false; error: string } | null> {
  let usuario;
  try {
    usuario = await obtenerUsuario();
  } catch (error) {
    // Backend apagado o inalcanzable: se informa en pantalla, sin error 500.
    return traducirError(error);
  }
  if (!usuario) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  if (usuario.rol !== 'RECEPCION') return { ok: false, error: 'Acceso denegado' };
  return null;
}

function traducirError(error: unknown): { ok: false; error: string } {
  if (error instanceof SesionInvalidaError) {
    return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  }
  if (error instanceof ApiError) return { ok: false, error: error.message };
  console.error('Error al llamar a la API:', error);
  return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

/** Paso 1: busca miembros por nombre, documento o código. */
export async function buscarMiembros(texto: string): Promise<Resultado<MiembroEncontrado[]>> {
  const denegado = await verificarRecepcion();
  if (denegado) return denegado;

  const invalido = validarBusqueda(texto);
  if (invalido) return { ok: false, error: invalido };

  try {
    const q = encodeURIComponent(texto.trim());
    return { ok: true, datos: await api<MiembroEncontrado[]>(`miembros/buscar?q=${q}`) };
  } catch (error) {
    return traducirError(error);
  }
}

interface DatosOperacion {
  miembroId: string;
  planId: string;
  fechaInicio: string;
}

function idsInvalidos({ miembroId, planId }: DatosOperacion): { ok: false; error: string } | null {
  if (!UUID.test(miembroId)) return { ok: false, error: 'El miembro no existe.' };
  if (!UUID.test(planId)) return { ok: false, error: 'El plan no existe.' };
  return null;
}

/** Paso 3: resumen de la operación (compra o renovación), sin guardar nada. */
export async function obtenerResumen(datos: DatosOperacion): Promise<Resultado<ResumenOperacion>> {
  const denegado = await verificarRecepcion();
  if (denegado) return denegado;
  const invalido = idsInvalidos(datos);
  if (invalido) return invalido;

  const query = new URLSearchParams({
    miembroId: datos.miembroId,
    planId: datos.planId,
    fechaInicio: datos.fechaInicio,
  });
  try {
    return { ok: true, datos: await api<ResumenOperacion>(`membresias/resumen?${query}`) };
  } catch (error) {
    return traducirError(error);
  }
}

/** Confirma la operación: queda Pendiente de pago y el Módulo 5 genera el cobro. */
export async function registrarMembresia(datos: DatosOperacion): Promise<Resultado<string>> {
  const denegado = await verificarRecepcion();
  if (denegado) return denegado;
  const invalido = idsInvalidos(datos);
  if (invalido) return invalido;

  try {
    await api('membresias', { method: 'POST', body: datos });
  } catch (error) {
    return traducirError(error);
  }
  return { ok: true, datos: MENSAJE_REGISTRADA };
}
