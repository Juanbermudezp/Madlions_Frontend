'use client';

import { useState } from 'react';
import { botonSecundarioCss } from '@/components/clases/estilos';
import { exportarReportePDF, type DatosReportePdf } from '@/lib/exportar-pdf';

/** FE-26.2 · Botón "Exportar PDF", reutilizable por los demás reportes. */
export function BotonExportarPdf({
  obtenerDatos,
  deshabilitado = false,
}: {
  obtenerDatos: () => DatosReportePdf;
  deshabilitado?: boolean;
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');

  async function exportar() {
    setGenerando(true);
    setError('');
    try {
      await exportarReportePDF(obtenerDatos());
    } catch (e) {
      console.error('Error al generar el PDF:', e);
      setError('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={exportar} disabled={deshabilitado || generando} className={botonSecundarioCss}>
        {generando ? 'Generando PDF…' : 'Exportar PDF'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
