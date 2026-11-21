import type { Rutina } from './rutinas';

export interface EntrenadorDeRutina { id: string; nombre: string; apellido: string }
export type DiaDeRutina = Rutina['dias'][number];
export type EjercicioDeRutina = DiaDeRutina['ejercicios'][number];
export interface RutinaPropiaResumen {
  id: string; nombre: string; objetivo: string; fechaInicio: string; entrenador: EntrenadorDeRutina;
}
export interface RutinaPropiaDetalle extends RutinaPropiaResumen { dias: DiaDeRutina[] }
export type ResultadoRutinaPropia<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number };

export const ERROR_CONEXION_RUTINAS = 'No se pudo conectar con el servidor. Intenta de nuevo.';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

export function esResumenRutinaPropia(valor: unknown): valor is RutinaPropiaResumen {
  return esObjeto(valor) && typeof valor.id === 'string' && typeof valor.nombre === 'string'
    && typeof valor.objetivo === 'string' && typeof valor.fechaInicio === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(valor.fechaInicio) && esObjeto(valor.entrenador)
    && typeof valor.entrenador.id === 'string' && typeof valor.entrenador.nombre === 'string'
    && typeof valor.entrenador.apellido === 'string';
}

export function esDetalleRutinaPropia(valor: unknown): valor is RutinaPropiaDetalle {
  return esResumenRutinaPropia(valor) && 'dias' in valor && Array.isArray(valor.dias)
    && valor.dias.every((dia: unknown) => esObjeto(dia) && typeof dia.id === 'string'
      && typeof dia.nombre === 'string' && Number.isInteger(dia.orden) && Array.isArray(dia.ejercicios)
      && dia.ejercicios.every((e: unknown) => esObjeto(e) && typeof e.id === 'string'
        && typeof e.nombre === 'string' && Number.isInteger(e.orden) && Number.isInteger(e.series)
        && Number.isInteger(e.repeticiones) && Number.isInteger(e.descansoSeg)));
}
