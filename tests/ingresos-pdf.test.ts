// @vitest-environment node
import type { jsPDF } from 'jspdf';
import { afterEach, expect, it, vi } from 'vitest';
import { exportarReportePDF } from '@/lib/exportar-pdf';
import { datosIngresosPdf } from '@/lib/reportes-ingresos';
import { sumarDias } from '@/lib/clases';
import { INGRESOS, INGRESOS_CERO, RANGO_INGRESOS } from './ingresos-fixtures';

const documentos = vi.hoisted(() => [] as jsPDF[]);
vi.mock('jspdf', async (original) => {
  const real = await original<typeof import('jspdf')>();
  return { ...real, jsPDF: class extends real.jsPDF {
    constructor(...args: ConstructorParameters<typeof real.jsPDF>) {
      super(...args);
      // Generación real de bytes con jsPDF/autoTable; solo se evita descargar.
      Object.defineProperty(this, 'save', { value: vi.fn(), configurable: true });
      documentos.push(this);
    }
  } };
});
afterEach(() => { documentos.length = 0; vi.clearAllMocks(); });

it('el exportador compartido genera un PDF real con título, fecha, totales y desgloses', async () => {
  await exportarReportePDF({ ...datosIngresosPdf(INGRESOS, RANGO_INGRESOS), generadoEn: new Date('2026-11-20T16:05:00Z') });
  const doc = documentos[0];
  expect(doc.save).toHaveBeenCalledWith('reporte-ingresos-2026-11-18-2026-11-20.pdf');
  const contenido = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  for (const texto of ['%PDF-', 'Reporte de ingresos', '18/11/2026 al 20/11/2026', 'Generado el 20/11/2026 10:05', '$1,130.00', '$1,000.00', '$130.00', '25.6 %', 'Sesiones adicionales', '20/11/2026']) expect(contenido).toContain(texto);
});
it('exporta un año completo en varias páginas, incluyendo el último día con cero', async () => {
  const datos = { ...INGRESOS_CERO, porDia: Array.from({ length: 365 }, (_, i) => ({ fecha: sumarDias('2026-01-01', i), total: 0 })) };
  await exportarReportePDF(datosIngresosPdf(datos, { desde: '2026-01-01', hasta: '2026-12-31' }));
  expect(documentos[0].getNumberOfPages()).toBeGreaterThan(1);
  const contenido = Buffer.from(documentos[0].output('arraybuffer')).toString('latin1');
  expect(contenido).toContain('31/12/2026'); expect(contenido).toContain('$0.00');
});
