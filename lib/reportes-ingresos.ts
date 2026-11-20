import type { ConceptoCobro } from './pagos';
import { ETIQUETA_TIPO_PLAN, formatearPrecio, TIPOS_PLAN, type TipoPlan } from './planes';
import { esFecha } from './clases';
import { fechaCorta, textoPorcentaje, type RangoReporte } from './reportes';
import type { DatosReportePdf } from './exportar-pdf';

export const CONCEPTOS_INGRESOS = ['MEMBRESIA', 'RENOVACION', 'SESION_ADICIONAL'] as const;
export const ETIQUETA_CONCEPTO_INGRESOS: Record<ConceptoCobro, string> = {
  MEMBRESIA: 'Membresías', RENOVACION: 'Renovaciones', SESION_ADICIONAL: 'Sesiones adicionales',
};
export const ETIQUETA_PLAN_INGRESOS = { ...ETIQUETA_TIPO_PLAN, DAYPASS: 'Daypass' };
export const PAGOS_INGRESOS_POR_PAGINA = 20;
export { formatearPrecio as monedaIngresos };

export interface IngresoDiario { fecha: string; total: number }
export interface ComparacionIngresos { total: number; diferencia: number; porcentaje: number | null }
export interface ReporteIngresos {
  total: number; subtotal: number; iva: number;
  porConcepto: { concepto: ConceptoCobro; total: number }[];
  porTipoPlan: { tipoPlan: TipoPlan; total: number }[];
  porDia: IngresoDiario[];
  anterior: ComparacionIngresos;
}
export interface PagoIngreso { miembro: string; codigo: string; fecha: string; monto: number; referencia: string }
export interface DetalleIngresos { items: PagoIngreso[]; total: number; pagina: number }

export function textoComparacionIngresos(anterior: ComparacionIngresos) {
  return {
    direccion: anterior.diferencia > 0 ? 'sube' : anterior.diferencia < 0 ? 'baja' : 'igual',
    descripcion: anterior.diferencia > 0 ? 'Aumento' : anterior.diferencia < 0 ? 'Disminución' : 'Sin cambios',
    diferencia: `${anterior.diferencia > 0 ? '+' : ''}${formatearPrecio(anterior.diferencia)}`,
    porcentaje: anterior.porcentaje === null ? 'Sin período de comparación'
      : `${anterior.porcentaje > 0 ? '+' : ''}${textoPorcentaje(anterior.porcentaje)}`,
  };
}

export const ordenarIngresosDiarios = (dias: IngresoDiario[]) => [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha));

/** Solo transforma datos del backend; no vuelve a calcular IVA ni comparación. */
export function datosIngresosPdf(reporte: ReporteIngresos, rango: RangoReporte): DatosReportePdf {
  const comparacion = textoComparacionIngresos(reporte.anterior);
  return { titulo: 'Reporte de ingresos', nombre: 'ingresos', rango: { ...rango },
    columnas: ['Sección', 'Concepto / fecha', 'Importe / comparación'],
    filas: [
      ['Totales', 'Ingresos totales (IVA incluido)', formatearPrecio(reporte.total)],
      ['Totales', 'Subtotal', formatearPrecio(reporte.subtotal)],
      ['Totales', 'IVA (13 %)', formatearPrecio(reporte.iva)],
      ['Comparación', 'Ingresos del período anterior', formatearPrecio(reporte.anterior.total)],
      ['Comparación', comparacion.descripcion, comparacion.diferencia],
      ['Comparación', 'Variación', comparacion.porcentaje],
      ...reporte.porConcepto.map((c) => ['Por concepto', ETIQUETA_CONCEPTO_INGRESOS[c.concepto], formatearPrecio(c.total)]),
      ['Por tipo de plan', 'Solo membresías y renovaciones; no incluye sesiones adicionales', ''],
      ...reporte.porTipoPlan.map((p) => ['Por tipo de plan', ETIQUETA_PLAN_INGRESOS[p.tipoPlan], formatearPrecio(p.total)]),
      ...ordenarIngresosDiarios(reporte.porDia).map((d) => ['Ingresos por día', fechaCorta(d.fecha), formatearPrecio(d.total)]),
    ],
  };
}

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validación de forma, sin recalcular importes ni balances del servidor. */
export function esReporteIngresos(v: unknown): v is ReporteIngresos {
  return objeto(v) && numero(v.total) && numero(v.subtotal) && numero(v.iva)
    && objeto(v.anterior) && numero(v.anterior.total) && numero(v.anterior.diferencia)
    && (v.anterior.porcentaje === null || numero(v.anterior.porcentaje))
    && Array.isArray(v.porConcepto) && v.porConcepto.length === 3
    && v.porConcepto.every((c: unknown) => objeto(c) && CONCEPTOS_INGRESOS.includes(c.concepto as ConceptoCobro) && numero(c.total))
    && new Set(v.porConcepto.map((c) => c.concepto)).size === 3
    && Array.isArray(v.porTipoPlan) && v.porTipoPlan.length === 3
    && v.porTipoPlan.every((p: unknown) => objeto(p) && TIPOS_PLAN.includes(p.tipoPlan as TipoPlan) && numero(p.total))
    && new Set(v.porTipoPlan.map((p) => p.tipoPlan)).size === 3
    && Array.isArray(v.porDia) && v.porDia.length > 0
    && v.porDia.every((d: unknown) => objeto(d) && typeof d.fecha === 'string' && esFecha(d.fecha) && numero(d.total));
}

export function esDetalleIngresos(v: unknown, pagina: number): v is DetalleIngresos {
  return objeto(v) && Number.isSafeInteger(v.total) && (v.total as number) >= 0 && v.pagina === pagina
    && Array.isArray(v.items) && v.items.length <= PAGOS_INGRESOS_POR_PAGINA
    && v.items.every((p: unknown) => objeto(p) && typeof p.miembro === 'string' && typeof p.codigo === 'string'
      && typeof p.fecha === 'string' && esFecha(p.fecha) && numero(p.monto) && typeof p.referencia === 'string');
}
