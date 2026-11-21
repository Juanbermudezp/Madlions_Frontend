import type { ReporteIngresos, PagoIngreso } from '@/lib/reportes-ingresos';

export const RANGO_INGRESOS = { desde: '2026-11-18', hasta: '2026-11-20' };
/** QA-27.1 A: valores literales calculados a mano, independientes de H27. */
export const INGRESOS_A: ReporteIngresos = {
  total: 192.1, subtotal: 170, iva: 22.1,
  porConcepto: [{ concepto: 'MEMBRESIA', total: 113 }, { concepto: 'RENOVACION', total: 56.5 }, { concepto: 'SESION_ADICIONAL', total: 22.6 }],
  porTipoPlan: [{ tipoPlan: 'DAYPASS', total: 113 }, { tipoPlan: 'MENSUAL', total: 56.5 }, { tipoPlan: 'SET_CLASES', total: 0 }],
  porDia: [{ fecha: '2026-11-01', total: 169.5 }, { fecha: '2026-11-02', total: 22.6 }],
  anterior: { total: 113, diferencia: 79.1, porcentaje: 70 },
};
export const INGRESOS: ReporteIngresos = {
  total: 1130, subtotal: 1000, iva: 130,
  porConcepto: [{ concepto: 'MEMBRESIA', total: 500 }, { concepto: 'RENOVACION', total: 400 }, { concepto: 'SESION_ADICIONAL', total: 230 }],
  porTipoPlan: [{ tipoPlan: 'DAYPASS', total: 100 }, { tipoPlan: 'MENSUAL', total: 600 }, { tipoPlan: 'SET_CLASES', total: 200 }],
  porDia: [{ fecha: '2026-11-18', total: 1130 }, { fecha: '2026-11-19', total: 0 }, { fecha: '2026-11-20', total: 0 }],
  anterior: { total: 900, diferencia: 230, porcentaje: 25.6 },
};
export const INGRESOS_CERO: ReporteIngresos = {
  total: 0, subtotal: 0, iva: 0,
  porConcepto: INGRESOS.porConcepto.map((c) => ({ ...c, total: 0 })),
  porTipoPlan: INGRESOS.porTipoPlan.map((p) => ({ ...p, total: 0 })),
  porDia: INGRESOS.porDia.map((d) => ({ ...d, total: 0 })),
  anterior: { total: 0, diferencia: 0, porcentaje: null },
};
export const pagoIngreso = (i: number): PagoIngreso => ({
  miembro: `Miembro QA ${i}`, codigo: `MBR-${String(i).padStart(6, '0')}`, fecha: '2026-11-18', monto: 35,
  referencia: `PAY-20261118-${String(i).padStart(6, '0')}`,
});
export const paginaIngresos = (pagina: number) => ({ ok: true as const, datos: {
  items: Array.from({ length: pagina === 1 ? 20 : 5 }, (_, i) => pagoIngreso((pagina - 1) * 20 + i + 1)), total: 25, pagina,
} });
