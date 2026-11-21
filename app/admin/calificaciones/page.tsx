import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerCalificaciones } from '@/app/actions/calificaciones';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { PanelCalificaciones } from '@/components/calificaciones/panel-calificaciones';
import { rangoPorDefecto } from '@/lib/reportes';

export const metadata: Metadata = { title: 'Calificaciones | Madlions' };

/** FE-21.1 · Panel de calificaciones: los últimos 30 días al abrir. */
export default async function Page() {
  const rango = rangoPorDefecto();
  const inicial = await obtenerCalificaciones(rango);

  if (!inicial.ok && inicial.estado === 401) redirect('/login');
  if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;

  return <PanelCalificaciones inicial={inicial} rangoInicial={rango} />;
}
