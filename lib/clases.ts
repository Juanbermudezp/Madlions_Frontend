/**
 * Tipos y utilidades de la programación de clases (H4).
 * Se usan tanto en el servidor como en el navegador: no importan nada del
 * servidor de Next. Las fechas se muestran siempre en hora de El Salvador.
 */

export const ZONA_HORARIA = 'America/El_Salvador';
const DESFASE = '-06:00'; // El Salvador no usa horario de verano.

export type EstadoClaseVisible = 'PROGRAMADA' | 'CANCELADA_GIMNASIO' | 'IMPARTIDA';

export interface TipoClase {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface EntrenadorResumen {
  id: string;
  nombre: string;
}

/** Clase tal como la devuelve GET /clases (agenda semanal). */
export interface ClaseAgenda {
  id: string;
  tipo: { id: string; nombre: string };
  entrenador: EntrenadorResumen;
  descripcion: string | null;
  inicio: string;
  fin: string;
  cupoMaximo: number;
  reservasConfirmadas: number;
  lugaresDisponibles: number;
  estado: EstadoClaseVisible;
}

export interface DatosTipoClase {
  nombre: string;
  descripcion: string;
}

export interface DatosClase {
  tipoClaseId: string;
  entrenadorId: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cupoMaximo: number;
}

/** Resultado de las Server Actions de este módulo. */
export type ResultadoAccion =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; campo?: string };

export const ETIQUETA_ESTADO: Record<EstadoClaseVisible, string> = {
  PROGRAMADA: 'Programada',
  IMPARTIDA: 'Impartida',
  CANCELADA_GIMNASIO: 'Cancelada por el gimnasio',
};

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** true si es AAAA-MM-DD y existe en el calendario. */
export function esFecha(valor: string): boolean {
  if (!FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function esHora(valor: string): boolean {
  return HORA.test(valor);
}

/** Fecha (AAAA-MM-DD) de un instante en El Salvador. */
export function fechaLocal(instante: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instante));
}

/** Hora (HH:MM) de un instante en El Salvador. */
export function horaLocal(instante: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_HORARIA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instante));
}

export function hoyLocal(ahora: Date = new Date()): string {
  return fechaLocal(ahora);
}

/** "2026-11-10" + "07:30" en hora de El Salvador -> instante. */
export function aInstante(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00${DESFASE}`);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana a la que pertenece la fecha. */
export function lunesDe(fecha: string): string {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((dia + 6) % 7));
}

export function diasDeLaSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

function formatearDia(fecha: string, opciones: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', ...opciones }).format(
    new Date(`${fecha}T12:00:00Z`),
  );
}

/** "lun 9" */
export function etiquetaDiaCorta(fecha: string): string {
  return formatearDia(fecha, { weekday: 'short', day: 'numeric' }).replace('.', '');
}

/** "lunes 9 de noviembre" */
export function etiquetaDiaLarga(fecha: string): string {
  return formatearDia(fecha, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "9 al 15 de noviembre de 2026" */
export function etiquetaSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  const inicio = formatearDia(lunes, { day: 'numeric' });
  const fin = formatearDia(domingo, { day: 'numeric', month: 'long', year: 'numeric' });
  const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
  return mismoMes
    ? `${inicio} al ${fin}`
    : `${formatearDia(lunes, { day: 'numeric', month: 'long' })} al ${fin}`;
}

/** Minutos desde las 00:00 de un "HH:MM". */
export function minutosDelDia(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** El administrador solo modifica clases programadas que aún no empiezan. */
export function esModificable(clase: ClaseAgenda, ahora: Date = new Date()): boolean {
  return clase.estado === 'PROGRAMADA' && new Date(clase.inicio) > ahora;
}

// ---------------------------------------------------------------------------
// Validaciones (las mismas reglas que el backend)
// ---------------------------------------------------------------------------

export type ErroresFormulario = Partial<Record<string, string>>;

export function validarTipoClase({ nombre, descripcion }: DatosTipoClase): ErroresFormulario {
  const errores: ErroresFormulario = {};
  const n = nombre.trim().length;
  if (n < 2 || n > 40) errores.nombre = 'El nombre debe tener entre 2 y 40 caracteres.';
  const d = descripcion.trim().length;
  if (d < 1 || d > 300) {
    errores.descripcion = 'La descripción es obligatoria y puede tener hasta 300 caracteres.';
  }
  return errores;
}

export function validarClase(
  datos: DatosClase,
  { reservasConfirmadas = 0, ahora = new Date() }: { reservasConfirmadas?: number; ahora?: Date } = {},
): ErroresFormulario {
  const errores: ErroresFormulario = {};

  if (!datos.tipoClaseId) errores.tipoClaseId = 'Elige el tipo de clase.';
  if (!datos.entrenadorId) errores.entrenadorId = 'Elige el entrenador.';
  if (datos.descripcion.trim().length > 300) {
    errores.descripcion = 'La descripción puede tener hasta 300 caracteres.';
  }

  if (!esFecha(datos.fecha)) {
    errores.fecha = 'La fecha no es válida.';
  } else if (!esHora(datos.horaInicio) || !esHora(datos.horaFin)) {
    errores.horario = 'Indica la hora de inicio y la de fin.';
  } else if (datos.horaFin <= datos.horaInicio) {
    errores.horario = 'La hora de fin debe ser posterior a la de inicio.';
  } else if (aInstante(datos.fecha, datos.horaInicio) <= ahora) {
    errores.horario = 'La fecha y hora de inicio ya pasaron.';
  }

  const cupo = datos.cupoMaximo;
  if (!Number.isInteger(cupo) || cupo < 1 || cupo > 50) {
    errores.cupoMaximo = 'El cupo máximo debe ser un número entero de 1 a 50.';
  } else if (cupo < reservasConfirmadas) {
    errores.cupoMaximo = `El cupo no puede ser menor que las reservas confirmadas (${reservasConfirmadas}).`;
  }

  return errores;
}

/**
 * Campo del formulario al que corresponde un mensaje de error del backend,
 * para mostrarlo junto al campo y no solo arriba del formulario.
 */
export function campoDelMensaje(mensaje: string): string | undefined {
  if (/^(El nombre|Ya existe un tipo de clase)/.test(mensaje)) return 'nombre';
  if (/^La descripción/.test(mensaje)) return 'descripcion';
  if (/^El tipo de clase/.test(mensaje)) return 'tipoClaseId';
  if (/^El cupo/.test(mensaje)) return 'cupoMaximo';
  if (/^La fecha no es válida/.test(mensaje)) return 'fecha';
  if (/^El entrenador ya tiene/.test(mensaje)) return 'horario';
  if (/^El entrenador/.test(mensaje)) return 'entrenadorId';
  if (/^(La fecha|La hora|Las horas)/.test(mensaje)) return 'horario';
  return undefined;
}
