import type { ReporteRenovacion } from '@/lib/reportes-renovacion';
export const RANGO_RENOVACION = { desde: '2026-10-07', hasta: '2026-11-06' };
/** Oráculo oficial fijo06/11/2026:4/7=57.1 HALF_UP;100-57.1=42.9. */
export const RENOVACION: ReporteRenovacion = {
  renovadas: 4, canceladas: 3, enPeriodo: 1, tasaRenovacion: 57.1, tasaCancelacion: 42.9,
  noRenovaron: [
    { nombre: 'Sofía Castillo', codigo: 'MBR-000045', plan: 'Set de clases mensual', fechaVencimiento: '2026-10-25' },
    { nombre: 'Diego Flores', codigo: 'MBR-000033', plan: 'Mensual', fechaVencimiento: '2026-10-20' },
    { nombre: 'Laura Hernández', codigo: 'MBR-000021', plan: 'Mensual', fechaVencimiento: '2026-10-15' },
  ],
};
export const RENOVACION_VACIA: ReporteRenovacion = { renovadas: 0, canceladas: 0, enPeriodo: 0, tasaRenovacion: null, tasaCancelacion: null, noRenovaron: [] };
