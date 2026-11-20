/**
 * FE-26.2 · Exportación de reportes a PDF en el navegador, reutilizable por
 * H27, H28 y H29. Usa jsPDF y jspdf-autotable, que se cargan solo al exportar.
 */

import { fechaCorta, textoRango, type RangoReporte } from './reportes';
import { ZONA_HORARIA } from './clases';

export interface DatosReportePdf {
  /** Título visible, por ejemplo "Reporte de ocupación de clases grupales". */
  titulo: string;
  /** Nombre corto para el archivo, por ejemplo "ocupacion". */
  nombre: string;
  rango: RangoReporte;
  columnas: string[];
  filas: string[][];
  /** Fecha de generación; por defecto, ahora. */
  generadoEn?: Date;
}

/** reporte-{nombre}-{desde}-{hasta}.pdf */
export function nombreArchivoPdf(nombre: string, { desde, hasta }: RangoReporte): string {
  return `reporte-${nombre}-${desde}-${hasta}.pdf`;
}

/** "Generado el 18/11/2026 16:05" en hora de El Salvador. */
export function textoGeneradoEl(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? '';
  return `Generado el ${fechaCorta(`${p('year')}-${p('month')}-${p('day')}`)} ${p('hour')}:${p('minute')}`;
}

/** Arma el PDF con el título, el rango, la tabla y la fecha de generación, y lo descarga. */
export async function exportarReportePDF(datos: DatosReportePdf): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: datos.columnas.length > 5 ? 'landscape' : 'portrait', unit: 'pt' });
  const margen = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(datos.titulo, margen, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Período: ${textoRango(datos.rango)}`, margen, 68);
  doc.text(textoGeneradoEl(datos.generadoEn ?? new Date()), margen, 82);

  autoTable(doc, {
    startY: 96,
    margin: { left: margen, right: margen },
    head: [datos.columnas],
    body: datos.filas,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [24, 24, 27], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 244, 245] },
  });

  doc.save(nombreArchivoPdf(datos.nombre, datos.rango));
}
