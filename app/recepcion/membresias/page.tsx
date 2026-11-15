import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { Plan } from '@/lib/planes';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { RegistroMembresia } from '@/components/membresias/registro-membresia';

export const metadata: Metadata = { title: 'Compras y renovaciones | Madlions' };

/** FE-2.1: registro de compras y renovaciones de membresía (recepción). */
export default async function Page() {
  let planes: Plan[] | null = null;
  let error = '';
  let sesionVencida = false;

  try {
    // Para recepción, la API ya devuelve solo los planes activos.
    planes = await api<Plan[]>('planes');
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : '';
  }

  if (sesionVencida) redirect('/login');
  if (!planes) return <ErrorCarga mensaje={`No se pudieron cargar los planes. ${error}`} />;

  return <RegistroMembresia planes={planes.filter((plan) => plan.activo)} />;
}
