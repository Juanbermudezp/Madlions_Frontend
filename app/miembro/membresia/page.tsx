import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { MiMembresia } from '@/lib/membresias';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { MiMembresiaVista } from '@/components/membresias/mi-membresia';

export const metadata: Metadata = { title: 'Mi membresía | Madlions' };

/** FE-3.1: estado de la membresía del miembro autenticado. */
export default async function Page() {
  let membresia: MiMembresia | null = null;
  let error = '';
  let sesionVencida = false;

  try {
    // El miembro sale del token: la API nunca recibe un id de miembro.
    membresia = await api<MiMembresia>('membresias/mia');
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : '';
  }

  if (sesionVencida) redirect('/login');
  if (!membresia) return <ErrorCarga mensaje={`No se pudo cargar tu membresía. ${error}`} />;

  return <MiMembresiaVista membresia={membresia} />;
}
