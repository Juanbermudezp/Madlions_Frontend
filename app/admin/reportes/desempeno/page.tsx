import type { Metadata } from 'next';
import { VacioReporte } from '@/components/reportes/estados-reporte';

export const metadata: Metadata = { title: 'Reporte de desempeño de entrenadores | Madlions' };

/** Lugar reservado para H29: reemplazar con la pantalla del reporte. */
export default function Page() {
  return <VacioReporte mensaje="Reporte de desempeño de entrenadores" detalle="Este reporte se agrega con H29." />;
}
