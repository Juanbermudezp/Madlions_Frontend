/**
 * Tipos y utilidades del panel de cobros del administrador (H13). Se usan en
 * el servidor y en el navegador: no importan nada del servidor de Next.
 */

import type { ConceptoCobro, EstadoCobro } from './pagos';

export { ETIQUETA_CONCEPTO } from './pagos';
export type { ConceptoCobro, EstadoCobro } from './pagos';

/** Resultado de una Server Action. `estado` es el código HTTP del error, si lo hubo. */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; estado?: number };

/** Cobro tal como lo devuelve GET /cobros (H13). */
export interface CobroAdmin {
    id: string;
    miembro: { nombre: string; codigo: string };
    concepto: ConceptoCobro;
    /** Plan, o fecha y entrenador de la sesión. */
    detalle: string;
    /** USD, IVA incluido. */
    monto: number;
    /** ISO. */
    creadoEn: string;
    /** Lo calcula el backend con la fecha de El Salvador. */
    habilitado: boolean;
    /** AAAA-MM-DD; null = se puede pagar desde que se generó. */
    habilitadoDesde: string | null;
    /** ISO; null si está pendiente. */
    pagadoEn: string | null;
    /** Referencia del pago aprobado (solo los pagados). */
    referencia?: string;
}

/** Respuesta de GET /cobros. `total` y `sumaMontos` corresponden a los filtros aplicados. */
export interface PaginaCobros {
    items: CobroAdmin[];
    total: number;
    sumaMontos: number;
    pagina: number;
}

/** Filtros del panel. `concepto` vacío = todos; `q` vacío = sin búsqueda. */
export interface FiltrosCobros {
    estado: EstadoCobro;
    concepto: ConceptoCobro | '';
    q: string;
    pagina: number;
}

export const FILTROS_INICIALES: FiltrosCobros = { estado: 'PENDIENTE', concepto: '', q: '', pagina: 1 };

/** Cobros por página (lo fija el backend). */
export const COBROS_POR_PAGINA = 20;

/** Actualización automática del panel. */
export const REFRESCO_MS = 30_000;

/** Largo máximo de la búsqueda (igual que el backend). */
export const BUSQUEDA_MAX = 100;

export const CONCEPTOS: ConceptoCobro[] = ['MEMBRESIA', 'RENOVACION', 'SESION_ADICIONAL'];

export const MENSAJES_COBROS_ADMIN = {
    sinPendientes: 'No hay cobros pendientes',
    sinPagados: 'No hay cobros pagados',
    noHabilitado: 'Pendiente, aún no habilitado',
    accesoDenegado: 'Acceso denegado',
    sesionExpirada: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    sinConexion: 'No se pudo conectar con el servidor. Intenta de nuevo.',
} as const;

/** Query string de GET /cobros. Solo se envían los filtros que tienen valor. */
export function queryCobros(filtros: FiltrosCobros): string {
    const params = new URLSearchParams({ estado: filtros.estado, pagina: String(filtros.pagina) });
    if (filtros.concepto) params.set('concepto', filtros.concepto);
    const q = filtros.q.trim();
    if (q) params.set('q', q.slice(0, BUSQUEDA_MAX));
    return params.toString();
}

/** Cantidad de páginas (al menos 1, aunque no haya cobros). */
export function totalPaginas(total: number): number {
    return Math.max(1, Math.ceil(total / COBROS_POR_PAGINA));
}

/** Renovación anticipada: sigue pendiente pero todavía no se puede pagar. */
export function esNoHabilitado(cobro: Pick<CobroAdmin, 'habilitado' | 'habilitadoDesde' | 'pagadoEn'>): boolean {
    return !cobro.pagadoEn && !cobro.habilitado && cobro.habilitadoDesde !== null;
}

/** "14:05:09" en hora de El Salvador (hora de la última actualización). */
export function horaActualizacion(instante: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/El_Salvador',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).format(instante);
}