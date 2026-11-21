import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerReporteDesempeno } from '@/app/actions/desempeno';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { ReporteDesempeno } from '@/components/reportes/reporte-desempeno';
import { rangoPorDefecto } from '@/lib/reportes';

export const metadata: Metadata = { title: 'Reporte de desempeño de entrenadores | Madlions' };

/** FE-29.1 · Pestaña Desempeño: los últimos 30 días al abrir. */
export default async function Page() {
  const rango = rangoPorDefecto();
  const inicial = await obtenerReporteDesempeno(rango);
  if (!inicial.ok && inicial.estado === 401) redirect('/login');
  if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;

  return <ReporteDesempeno inicial={inicial} rangoInicial={rango} />;
}
