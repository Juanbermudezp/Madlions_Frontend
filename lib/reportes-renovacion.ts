import { esFecha } from './clases';
import { fechaCorta, textoPorcentaje, type RangoReporte } from './reportes';
import type { DatosReportePdf } from './exportar-pdf';

export interface MembresiaNoRenovada { nombre: string; codigo: string; plan: string; fechaVencimiento: string }
export interface ReporteRenovacion {
  renovadas: number; canceladas: number; enPeriodo: number;
  tasaRenovacion: number | null; tasaCancelacion: number | null;
  noRenovaron: MembresiaNoRenovada[];
}

export const porcentajeRenovacion = (tasa: number | null) => tasa === null ? 'Sin datos suficientes' : textoPorcentaje(tasa);
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim();
export function buscarNoRenovaron(filas: MembresiaNoRenovada[], consulta: string) {
  const q = normalizar(consulta);
  return filas.filter((f) => normalizar(f.nombre).includes(q) || normalizar(f.codigo).includes(q));
}

/** Transformación de presentación. Tasas/conteos salen de la API, no se calculan aquí. */
export function datosRenovacionPdf(datos: ReporteRenovacion, rango: RangoReporte): DatosReportePdf {
  return { titulo: 'Reporte de renovación y cancelación', nombre: 'renovacion', rango: { ...rango },
    columnas: ['Sección / nombre', 'Código / indicador', 'Plan / valor', 'Fecha de vencimiento'],
    filas: [
      ['Resumen', 'Renovadas', String(datos.renovadas), ''],
      ['Resumen', 'Canceladas', String(datos.canceladas), ''],
      ['Resumen', 'En período de renovación', String(datos.enPeriodo), ''],
      ['Resumen', 'Tasa de renovación', porcentajeRenovacion(datos.tasaRenovacion), ''],
      ['Resumen', 'Tasa de cancelación', porcentajeRenovacion(datos.tasaCancelacion), ''],
      ...datos.noRenovaron.map((f) => [f.nombre, f.codigo, f.plan, fechaCorta(f.fechaVencimiento)]),
    ],
  };
}

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const contador = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const tasa = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100);
export function esReporteRenovacion(v: unknown): v is ReporteRenovacion {
  return objeto(v) && contador(v.renovadas) && contador(v.canceladas) && contador(v.enPeriodo)
    && tasa(v.tasaRenovacion) && tasa(v.tasaCancelacion)
    && (v.tasaRenovacion === null) === (v.tasaCancelacion === null)
    && Array.isArray(v.noRenovaron) && v.noRenovaron.every((f: unknown) => objeto(f)
      && typeof f.nombre === 'string' && typeof f.codigo === 'string' && typeof f.plan === 'string'
      && typeof f.fechaVencimiento === 'string' && esFecha(f.fechaVencimiento));
}
