import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerReporteOcupacion } from '@/app/actions/reportes';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { ReporteOcupacion } from '@/components/reportes/reporte-ocupacion';
import { rangoPorDefecto } from '@/lib/reportes';

export const metadata: Metadata = { title: 'Reporte de ocupación | Madlions' };

/** FE-26.1 · Pestaña Ocupación: los últimos 30 días al abrir. */
export default async function Page() {
  const rango = rangoPorDefecto();
  const inicial = await obtenerReporteOcupacion(rango);
  if (!inicial.ok && inicial.estado === 401) redirect('/login');
  if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;

  return <ReporteOcupacion inicial={inicial} rangoInicial={rango} />;
}
