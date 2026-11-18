// Tipos y utilidades del estado del equipo.


import type { Rol } from './roles';

export const ESTADOS_MAQUINA = [
  'OPERATIVA',
  'EN_MANTENIMIENTO',
  'FUERA_DE_SERVICIO',
] as const;

export const TIPOS_MAQUINA = ['CARDIO', 'FUERZA', 'PESO_LIBRE', 'FUNCIONAL'] as const;

export const ZONAS_MAQUINA = ['PISO_1', 'PISO_2', 'AREA_FUNCIONAL'] as const;

export type EstadoMaquina = (typeof ESTADOS_MAQUINA)[number];
export type TipoMaquina = (typeof TIPOS_MAQUINA)[number];
export type ZonaMaquina = (typeof ZONAS_MAQUINA)[number];

export const ETIQUETA_ESTADO_MAQUINA: Record<EstadoMaquina, string> = {
  OPERATIVA: 'Operativa',
  EN_MANTENIMIENTO: 'En mantenimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

export const ETIQUETA_TIPO_MAQUINA: Record<TipoMaquina, string> = {
  CARDIO: 'Cardio',
  FUERZA: 'Fuerza',
  PESO_LIBRE: 'Peso libre',
  FUNCIONAL: 'Funcional',
};

export const ETIQUETA_ZONA_MAQUINA: Record<ZonaMaquina, string> = {
  PISO_1: 'Piso 1',
  PISO_2: 'Piso 2',
  AREA_FUNCIONAL: 'Área funcional',
};

export const COLOR_ESTADO_MAQUINA: Record<
  EstadoMaquina,
  { contador: string; etiqueta: string; borde: string }
> = {
  OPERATIVA: {
    contador:
      'border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300',
    etiqueta:
      'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    borde: 'border-l-green-500',
  },
  EN_MANTENIMIENTO: {
    contador:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
    etiqueta:
      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    borde: 'border-l-amber-500',
  },
  FUERA_DE_SERVICIO: {
    contador:
      'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
    etiqueta: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    borde: 'border-l-red-500',
  },
};

export const SIN_FECHA_ESTIMADA = 'Sin fecha estimada';
export const SIN_MAQUINAS = 'No hay máquinas con esos filtros';

export interface Maquina {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoMaquina;
  zona: ZonaMaquina;
  estado: EstadoMaquina;
  fechaEstimadaRetorno: string | null;
  ultimoMotivo?: string | null;
  ultimoCambioPor?: { id: string; nombre: string; apellido: string } | null;
}

export type ResumenMaquinas = Record<EstadoMaquina, number>;

export interface InventarioMaquinas {
  resumen: ResumenMaquinas;
  maquinas: Maquina[];
}

// Filtros

export interface FiltrosMaquina {
  estado?: EstadoMaquina;
  tipo?: TipoMaquina;
  zona?: ZonaMaquina;
}

export type CampoFiltro = keyof FiltrosMaquina;

export interface ParametrosFiltro {
  estado?: string | string[];
  tipo?: string | string[];
  zona?: string | string[];
}

function valorDeLista<T extends string>(
  lista: readonly T[],
  valor: string | string[] | undefined,
): T | undefined {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return texto !== undefined && (lista as readonly string[]).includes(texto)
    ? (texto as T)
    : undefined;
}

export function esEstadoMaquina(valor: unknown): valor is EstadoMaquina {
  return typeof valor === 'string' && (ESTADOS_MAQUINA as readonly string[]).includes(valor);
}

export function esTipoMaquina(valor: unknown): valor is TipoMaquina {
  return typeof valor === 'string' && (TIPOS_MAQUINA as readonly string[]).includes(valor);
}

export function esZonaMaquina(valor: unknown): valor is ZonaMaquina {
  return typeof valor === 'string' && (ZONAS_MAQUINA as readonly string[]).includes(valor);
}

// Filtros válidos de la URL. 
export function filtrosDesdeParams(params: ParametrosFiltro): FiltrosMaquina {
  const estado = valorDeLista(ESTADOS_MAQUINA, params.estado);
  const tipo = valorDeLista(TIPOS_MAQUINA, params.tipo);
  const zona = valorDeLista(ZONAS_MAQUINA, params.zona);

  return {
    ...(estado ? { estado } : {}),
    ...(tipo ? { tipo } : {}),
    ...(zona ? { zona } : {}),
  };
}

export function hayFiltros(filtros: FiltrosMaquina): boolean {
  return Boolean(filtros.estado ?? filtros.tipo ?? filtros.zona);
}

export function consultaMaquinas(filtros: FiltrosMaquina): string {
  const params = new URLSearchParams();
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.zona) params.set('zona', filtros.zona);

  const consulta = params.toString();
  return consulta ? `?${consulta}` : '';
}

export function hrefConFiltros(rutaBase: string, filtros: FiltrosMaquina): string {
  return `${rutaBase}${consultaMaquinas(filtros)}`;
}

// Fechas

export function etiquetaFechaRetorno(fecha: string | null): string {
  if (!fecha) return SIN_FECHA_ESTIMADA;

  return new Intl.DateTimeFormat('es-SV', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${fecha}T12:00:00Z`));
}
// Cambio de estado e historial (H18)

/**
 * Quién abre el detalle y cambia el estado: el administrador y el entrenador,
 * que es quien detecta las fallas en el piso (supuesto S13). Para el miembro
 * y recepción la tarjeta no es clicable. Quien autoriza es el backend.
 */
export function puedeGestionarMaquinas(rol: Rol): boolean {
  return rol === 'ADMINISTRADOR' || rol === 'ENTRENADOR';
}

export const ESTADO_ACTUALIZADO = 'Estado actualizado';
export const SIN_HISTORIAL = 'Esta máquina todavía no ha cambiado de estado';

export const MOTIVO_INVALIDO =
  'El motivo es obligatorio y debe tener entre 5 y 250 caracteres.';
export const FECHA_RETORNO_FORMATO =
  'La fecha estimada de retorno debe tener el formato AAAA-MM-DD.';
export const FECHA_RETORNO_PASADA =
  'La fecha estimada de retorno no puede ser anterior a hoy.';

/** Un cambio de estado, como lo devuelve GET /maquinas/:id/historial. */
export interface CambioDeEstado {
  id: string;
  estadoAnterior: EstadoMaquina;
  estadoNuevo: EstadoMaquina;
  motivo: string;
  fechaEstimadaRetorno: string | null;
  usuario: { id: string; nombre: string; apellido: string };
  cambiadoEn: string;
}

/** Lo que escribe el formulario. La fecha llega como texto del input. */
export interface DatosCambioEstado {
  estado: EstadoMaquina | '';
  motivo: string;
  fechaEstimadaRetorno: string;
}

export type ErroresCambio = Partial<Record<keyof DatosCambioEstado, string>>;

/** El formulario no ofrece el estado en el que la máquina ya está. */
export function estadosDisponibles(actual: EstadoMaquina): EstadoMaquina[] {
  return ESTADOS_MAQUINA.filter((estado) => estado !== actual);
}

/** Al volver a OPERATIVA no se pide fecha estimada: ya retornó. */
export function pideFechaEstimada(estado: EstadoMaquina | ''): boolean {
  return estado !== '' && estado !== 'OPERATIVA';
}

/** Fecha de hoy (AAAA-MM-DD) en hora de El Salvador, para el mínimo del input. */
export function hoyEnElSalvador(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/** Las mismas reglas que el backend, para responder sin ir al servidor. */
export function validarCambioEstado(
  datos: DatosCambioEstado,
  hoy: string = hoyEnElSalvador(),
): ErroresCambio {
  const errores: ErroresCambio = {};

  if (!esEstadoMaquina(datos.estado)) {
    errores.estado = 'Elige el estado nuevo de la máquina.';
  }

  const motivo = datos.motivo.trim().length;
  if (motivo < 5 || motivo > 250) errores.motivo = MOTIVO_INVALIDO;

  const fecha = datos.fechaEstimadaRetorno.trim();
  if (fecha && pideFechaEstimada(datos.estado)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      errores.fechaEstimadaRetorno = FECHA_RETORNO_FORMATO;
    } else if (fecha < hoy) {
      errores.fechaEstimadaRetorno = FECHA_RETORNO_PASADA;
    }
  }

  return errores;
}

/** Campo al que corresponde un mensaje de error del backend. */
export function campoDelMensajeCambio(mensaje: string): keyof DatosCambioEstado | undefined {
  if (/^El motivo/.test(mensaje)) return 'motivo';
  if (/^(La fecha estimada|Una máquina que vuelve)/.test(mensaje)) return 'fechaEstimadaRetorno';
  if (/^El estado debe/.test(mensaje)) return 'estado';
  return undefined;
}

/**
 * "18 nov 2026, 09:20" en hora de El Salvador. Va en una columna de la tabla
 * del historial, así que el mes va abreviado para no comerse el ancho.
 */
export function etiquetaCambiadoEn(instante: string): string {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: 'America/El_Salvador',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instante));
}
