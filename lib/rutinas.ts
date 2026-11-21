import { esFecha, hoyLocal } from './clases';

export interface MiembroRutina { id: string; nombre: string; apellido: string; codigo: string }
export interface EjercicioRutina { nombre: string; series: number; repeticiones: number; descansoSeg: number }
export interface DiaRutina { nombre: string; ejercicios: EjercicioRutina[] }
export interface DatosRutina { nombre: string; objetivo: string; fechaInicio: string; dias: DiaRutina[] }
export interface Rutina extends Omit<DatosRutina, 'dias'> {
  id: string; miembroId: string; entrenadorId: string; creadoEn: string; actualizadoEn: string;
  miembro: MiembroRutina;
  dias: (Omit<DiaRutina, 'ejercicios'> & { id: string; orden: number;
    ejercicios: (EjercicioRutina & { id: string; orden: number })[] })[];
}
export type ErroresRutina = Record<string, string>;
export type ResultadoRutina<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number; campos?: ErroresRutina };
export const UUID_RUTINA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Compartida por editor y acciones. En PUT el backend decide si conserva la fecha previa. */
export function validarRutina(datos: DatosRutina, opciones: { fechaAnterior?: string; permitirPasada?: boolean; hoy?: string } = {}): ErroresRutina {
  const errores: ErroresRutina = {};
  const texto = (valor: unknown, campo: string, min: number, max: number) => {
    if (typeof valor !== 'string' || valor.trim().length < min || valor.trim().length > max) errores[campo] = `Ingresa entre ${min} y ${max} caracteres.`;
  };
  texto(datos?.nombre, 'nombre', 3, 60);
  texto(datos?.objetivo, 'objetivo', 1, 200);
  if (typeof datos?.fechaInicio !== 'string' || !esFecha(datos.fechaInicio)) errores.fechaInicio = 'Ingresa una fecha válida.';
  else if (!opciones.permitirPasada && datos.fechaInicio !== opciones.fechaAnterior && datos.fechaInicio < (opciones.hoy ?? hoyLocal())) errores.fechaInicio = 'La fecha debe ser hoy o posterior en El Salvador.';
  if (!Array.isArray(datos?.dias) || datos.dias.length < 1 || datos.dias.length > 7) errores.dias = 'Agrega entre 1 y 7 días.';
  if (Array.isArray(datos?.dias)) datos.dias.forEach((dia, i) => {
    const base = `dias[${i}]`;
    texto(dia?.nombre, `${base}.nombre`, 1, 40);
    if (!Array.isArray(dia?.ejercicios) || dia.ejercicios.length < 1 || dia.ejercicios.length > 15) errores[`${base}.ejercicios`] = 'Agrega entre 1 y 15 ejercicios.';
    if (Array.isArray(dia?.ejercicios)) dia.ejercicios.forEach((ejercicio, j) => {
      const ruta = `${base}.ejercicios[${j}]`;
      texto(ejercicio?.nombre, `${ruta}.nombre`, 1, 60);
      for (const [campo, min, max] of [['series', 1, 10], ['repeticiones', 1, 50], ['descansoSeg', 0, 600]] as const) {
        const valor = ejercicio?.[campo];
        if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < min || valor > max) errores[`${ruta}.${campo}`] = `Ingresa un entero entre ${min} y ${max}.`;
      }
    });
  });
  return errores;
}

/** Lista explícita: nunca reenvía IDs, orden, propietarios ni auditoría en PUT. */
export function cuerpoRutina(datos: DatosRutina): DatosRutina {
  return { nombre: datos.nombre.trim(), objetivo: datos.objetivo.trim(), fechaInicio: datos.fechaInicio,
    dias: datos.dias.map((dia) => ({ nombre: dia.nombre.trim(), ejercicios: dia.ejercicios.map((e) => ({
      nombre: e.nombre.trim(), series: e.series, repeticiones: e.repeticiones, descansoSeg: e.descansoSeg,
    })) })) };
}

export function camposErrorRutina(datos: unknown): ErroresRutina {
  if (!datos || typeof datos !== 'object' || !('message' in datos)) return {};
  const mensajes = Array.isArray(datos.message) ? datos.message : [datos.message];
  const campos: ErroresRutina = {};
  for (const mensaje of mensajes) {
    if (typeof mensaje !== 'string') continue;
    const ruta = mensaje.match(/^(nombre|objetivo|fechaInicio|miembroId|dias)(?=\.|\s|\[)([\w.\[\]]*)/)?.[0];
    if (ruta) campos[ruta.replace(/\.(\d+)/g, '[$1]')] = mensaje;
  }
  return campos;
}
