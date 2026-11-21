import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { obtenerReporteIngresos } from '@/app/actions/reportes';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { ReporteIngresos } from '@/components/reportes/reporte-ingresos';
import { rangoPorDefecto } from '@/lib/reportes';

export const metadata: Metadata = { title: 'Reporte de ingresos | Madlions' };

/** FE-27.1: mismo acceso y rango inicial que la pestaña de ocupación H26. */
export default async function Page() {
  // Fecha por defecto y datos financieros siempre se resuelven en la solicitud.
  await connection();
  const rango = rangoPorDefecto();
  const inicial = await obtenerReporteIngresos(rango);
  if (!inicial.ok && inicial.estado === 401) redirect('/login');
  if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;
  return <ReporteIngresos inicial={inicial} rangoInicial={rango} />;
}
