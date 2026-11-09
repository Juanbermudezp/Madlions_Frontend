import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { TipoClase } from '@/lib/clases';
import type { Plan } from '@/lib/planes';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { Planes } from '@/components/planes/planes';

export const metadata: Metadata = { title: 'Planes | Madlions' };

/** FE-1.1 y FE-1.2: administración de planes. */
export default async function Page() {
  let planes: Plan[] | null = null;
  let tipos: TipoClase[] | null = null;
  let precioClasePuntual: string | null = null;
  let error = '';
  let sesionVencida = false;

  try {
    let configuracion: { precio: string };
    [planes, tipos, configuracion] = await Promise.all([
      api<Plan[]>('planes'),
      api<TipoClase[]>('tipos-clase'),
      api<{ precio: string }>('configuracion/precio-clase-puntual'),
    ]);
    precioClasePuntual = configuracion.precio;
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : '';
  }

  if (sesionVencida) redirect('/login');
  if (!planes || !tipos || precioClasePuntual === null) {
    return <ErrorCarga mensaje={`No se pudieron cargar los planes. ${error}`} />;
  }

  return <Planes planes={planes} tiposClase={tipos} precioClasePuntual={precioClasePuntual} />;
}
