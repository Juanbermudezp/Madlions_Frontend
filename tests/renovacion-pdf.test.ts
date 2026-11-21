// @vitest-environment node
import type { jsPDF } from 'jspdf';
import { afterEach, expect, it, vi } from 'vitest';
import { exportarReportePDF } from '@/lib/exportar-pdf';
import { datosRenovacionPdf } from '@/lib/reportes-renovacion';
import { RENOVACION, RENOVACION_VACIA, RANGO_RENOVACION } from './renovacion-fixtures';
const documentos = vi.hoisted(() => [] as jsPDF[]);
vi.mock('jspdf', async (original) => {
  const real = await original<typeof import('jspdf')>();
  return { ...real, jsPDF: class extends real.jsPDF {
    constructor(...args: ConstructorParameters<typeof real.jsPDF>) {
      super(...args); Object.defineProperty(this, 'save', { value: vi.fn() }); documentos.push(this);
    }
  } };
});
afterEach(() => { documentos.length = 0; vi.clearAllMocks(); });
it('PDF real en memoria con título/rango/fecha/4–3–1/tasas y3miembros; save simulado', async () => {
  await exportarReportePDF({ ...datosRenovacionPdf(RENOVACION, RANGO_RENOVACION), generadoEn: new Date('2026-11-06T16:00:00Z') });
  const doc = documentos[0]; expect(doc.save).toHaveBeenCalledWith('reporte-renovacion-2026-10-07-2026-11-06.pdf');
  const bytes = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  for (const valor of ['%PDF-', '%%EOF', 'Reporte de renovación y cancelación', '07/10/2026 al 06/11/2026', 'Generado el 06/11/2026 10:00',
    'Renovadas', 'Canceladas', 'En período de renovación', '57.1 %', '42.9 %', 'Sofía Castillo', 'Diego Flores', 'Laura Hernández', 'MBR-000021', '25/10/2026']) expect(bytes).toContain(valor);
});
it('PDF sin denominador conserva tasasnull como texto y contador real de gracia', () => {
  const res = datosRenovacionPdf({ ...RENOVACION_VACIA, enPeriodo: 1 }, RANGO_RENOVACION);
  expect(res.filas).toContainEqual(['Resumen', 'En período de renovación', '1', '']);
  expect(res.filas).toContainEqual(['Resumen', 'Tasa de renovación', 'Sin datos suficientes', '']);
  expect(res.filas).toHaveLength(5);
});
