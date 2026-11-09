/**
 * Tipos y utilidades de la administración de planes (H1).
 * Se usan tanto en el servidor como en el navegador: no importan nada del
 * servidor de Next.
 */

import type { ErroresFormulario } from './clases';

export const TIPOS_PLAN = ['DAYPASS', 'MENSUAL', 'SET_CLASES'] as const;

export type TipoPlan = (typeof TIPOS_PLAN)[number];

export const ETIQUETA_TIPO_PLAN: Record<TipoPlan, string> = {
  DAYPASS: 'Day pass',
  MENSUAL: 'Mensual',
  SET_CLASES: 'Set de clases mensual',
};

/** Plan tal como lo devuelve GET /planes. */
export interface Plan {
  id: string;
  nombre: string;
  tipo: TipoPlan;
  precio: number;
  cantidadClases: number | null;
  duracionDias: number;
  beneficios: string;
  activo: boolean;
  tiposClase: { id: string; nombre: string }[];
}

/** Datos del formulario. El precio y la cantidad llegan como texto del input. */
export interface DatosPlan {
  nombre: string;
  tipo: TipoPlan | '';
  precio: string;
  cantidadClases: string;
  beneficios: string;
  tiposClaseIds: string[];
}

/** Mayor valor que cabe en DECIMAL(10,2), igual que en el backend. */
export const PRECIO_MAXIMO = 99_999_999.99;

const PRECIO = /^\d+(\.\d{1,2})?$/;
const ENTERO = /^\d+$/;

export function esTipoPlan(valor: unknown): valor is TipoPlan {
  return typeof valor === 'string' && (TIPOS_PLAN as readonly string[]).includes(valor);
}

/** "$35.50" */
export function formatearPrecio(precio: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(precio);
}

// ---------------------------------------------------------------------------
// Validaciones (las mismas reglas que el backend)
// ---------------------------------------------------------------------------

export function validarPlan(datos: DatosPlan): ErroresFormulario {
  const errores: ErroresFormulario = {};

  const n = datos.nombre.trim().length;
  if (n < 1 || n > 60) errores.nombre = 'El nombre es obligatorio y puede tener hasta 60 caracteres.';

  if (!esTipoPlan(datos.tipo)) errores.tipo = 'El tipo debe ser DAYPASS, MENSUAL o SET_CLASES.';

  const precio = datos.precio.trim();
  if (!PRECIO.test(precio) || Number(precio) <= 0 || Number(precio) > PRECIO_MAXIMO) {
    errores.precio = 'El precio debe ser mayor que 0 y tener como máximo 2 decimales.';
  }

  if (datos.tipo === 'SET_CLASES') {
    const cantidad = datos.cantidadClases.trim();
    if (!ENTERO.test(cantidad) || Number(cantidad) < 1 || Number(cantidad) > 100) {
      errores.cantidadClases = 'La cantidad de clases debe ser un entero entre 1 y 100.';
    }
  }

  const b = datos.beneficios.trim().length;
  if (b < 1 || b > 500) {
    errores.beneficios = 'Los beneficios son obligatorios y pueden tener hasta 500 caracteres.';
  }

  if (new Set(datos.tiposClaseIds).size !== datos.tiposClaseIds.length) {
    errores.tiposClaseIds = 'tiposClaseIds debe ser una lista de ids de tipos de clase sin repetir.';
  }

  return errores;
}

/**
 * Campo del formulario al que corresponde un mensaje de error del backend,
 * para mostrarlo junto al campo y no solo arriba del formulario.
 */
export function campoDelMensajePlan(mensaje: string): string | undefined {
  if (/^(El nombre|Ya existe un plan)/.test(mensaje)) return 'nombre';
  if (/^El tipo debe/.test(mensaje)) return 'tipo';
  if (/^El precio/.test(mensaje)) return 'precio';
  if (/^(La cantidad de clases|Los planes SET_CLASES|Solo los planes SET_CLASES)/.test(mensaje)) {
    return 'cantidadClases';
  }
  if (/^Los beneficios/.test(mensaje)) return 'beneficios';
  if (/^(tiposClaseIds|Uno o más tipos de clase)/.test(mensaje)) return 'tiposClaseIds';
  return undefined;
}
