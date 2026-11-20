import type { Metadata } from 'next';
import { VacioReporte } from '@/components/reportes/estados-reporte';

export const metadata: Metadata = { title: 'Reporte de ingresos | Madlions' };

/** Lugar reservado para H27: reemplazar con la pantalla del reporte. */
export default function Page() {
  return <VacioReporte mensaje="Reporte de ingresos" detalle="Este reporte se agrega con H27." />;
}
