// Tipos y utilidades del estado del equipo.


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
