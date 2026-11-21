import type { Metadata } from 'next';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { obtenerReporteRenovacion } from '@/app/actions/reportes';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { ReporteRenovacion } from '@/components/reportes/reporte-renovacion';
import { rangoPorDefecto } from '@/lib/reportes';

export const metadata: Metadata = { title: 'Tasa de renovación y cancelación | Madlions' };

export default async function Page() {
  await connection();
  const rango = rangoPorDefecto();
  const inicial = await obtenerReporteRenovacion(rango);
  if (!inicial.ok && inicial.estado === 401) redirect('/login');
  if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;
  return <ReporteRenovacion inicial={inicial} rangoInicial={rango} />;
}
