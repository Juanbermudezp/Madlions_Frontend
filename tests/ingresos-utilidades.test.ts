import { expect, it } from 'vitest';
import { datosIngresosPdf, monedaIngresos, ordenarIngresosDiarios, textoComparacionIngresos } from '@/lib/reportes-ingresos';
import { INGRESOS, INGRESOS_CERO, RANGO_INGRESOS } from './ingresos-fixtures';

it.each([[1234.56, '$1,234.56'], [35, '$35.00'], [0, '$0.00'], [-4.5, '-$4.50']])('formatea %s como %s', (monto, texto) => {
  expect(monedaIngresos(monto as number)).toBe(texto);
});
it.each([
  [230, 25.6, 'sube', 'Aumento', '+$230.00', '+25.6 %'],
  [-4.5, -11.3, 'baja', 'Disminución', '-$4.50', '-11.3 %'],
  [0, 0, 'igual', 'Sin cambios', '$0.00', '0.0 %'],
  [1130, null, 'sube', 'Aumento', '+$1,130.00', 'Sin período de comparación'],
] as const)('muestra comparación del servidor: %s y %s', (diferencia, porcentaje, direccion, descripcion, texto, variacion) => {
  expect(textoComparacionIngresos({ total: 900, diferencia, porcentaje })).toEqual({ direccion, descripcion, diferencia: texto, porcentaje: variacion });
});
it('ordena fechas sin desplazar zona horaria, sin mutar ni eliminar días cero', () => {
  const invertidos = [...INGRESOS.porDia].reverse();
  expect(ordenarIngresosDiarios(invertidos)).toEqual(INGRESOS.porDia);
  expect(invertidos[0].fecha).toBe('2026-11-20');
  expect(ordenarIngresosDiarios(invertidos).filter((d) => d.total === 0)).toHaveLength(2);
});
it('PDF incorpora todos los datos y conserva los valores calculados por backend', () => {
  const datos = datosIngresosPdf(INGRESOS, RANGO_INGRESOS);
  expect(datos).toMatchObject({ titulo: 'Reporte de ingresos', nombre: 'ingresos', rango: RANGO_INGRESOS });
  expect(datos.filas).toContainEqual(['Totales', 'Ingresos totales (IVA incluido)', '$1,130.00']);
  expect(datos.filas).toContainEqual(['Totales', 'Subtotal', '$1,000.00']);
  expect(datos.filas).toContainEqual(['Totales', 'IVA (13 %)', '$130.00']);
  expect(datos.filas).toContainEqual(['Comparación', 'Variación', '+25.6 %']);
  expect(datos.filas.filter((f) => f[0] === 'Por concepto')).toHaveLength(3);
  expect(datos.filas.filter((f) => f[0] === 'Por tipo de plan')).toHaveLength(4);
  expect(datos.filas.filter((f) => f[0] === 'Ingresos por día')).toEqual([
    ['Ingresos por día', '18/11/2026', '$1,130.00'], ['Ingresos por día', '19/11/2026', '$0.00'], ['Ingresos por día', '20/11/2026', '$0.00'],
  ]);
});
it('PDF cero y comparación null mantienen mensaje y ceros, sin porcentajes inventados', () => {
  expect(datosIngresosPdf(INGRESOS_CERO, RANGO_INGRESOS).filas).toContainEqual(['Comparación', 'Variación', 'Sin período de comparación']);
});
