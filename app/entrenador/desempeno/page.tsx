import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerMiDesempeno } from '@/app/actions/desempeno';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { MiDesempeno } from '@/components/reportes/mi-desempeno';
import { rangoPorDefecto } from '@/lib/reportes';

export const metadata: Metadata = { title: 'Mi desempeño | Madlions' };

/** FE-29.2 · Mi desempeño del entrenador: los últimos 30 días al abrir. */
export default async function Page() {
  const rango = rangoPorDefecto();
  const inicial = await obtenerMiDesempeno(rango);
  if (!inicial.ok && inicial.estado === 401) redirect('/login');
  if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;

  return <MiDesempeno inicial={inicial} rangoInicial={rango} />;
}
