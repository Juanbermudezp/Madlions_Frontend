import type { Metadata } from 'next';
import { VacioReporte } from '@/components/reportes/estados-reporte';

export const metadata: Metadata = { title: 'Tasa de renovación y cancelación | Madlions' };

/** Lugar reservado para H28: reemplazar con la pantalla del reporte. */
export default function Page() {
  return <VacioReporte mensaje="Tasa de renovación y cancelación" detalle="Este reporte se agrega con H28." />;
}
