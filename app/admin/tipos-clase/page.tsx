import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { TipoClase } from '@/lib/clases';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { TiposClase } from '@/components/clases/tipos-clase';

export const metadata: Metadata = { title: 'Tipos de clase | Madlions' };

/** FE-4.1: catálogo de tipos de clase del administrador. */
export default async function Page() {
  let tipos: TipoClase[] | null = null;
  let error = '';
  let sesionVencida = false;

  try {
    tipos = await api<TipoClase[]>('tipos-clase');
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : '';
  }

  if (sesionVencida) redirect('/login');
  if (!tipos) return <ErrorCarga mensaje={`No se pudieron cargar los tipos de clase. ${error}`} />;

  return <TiposClase tipos={tipos} />;
}
