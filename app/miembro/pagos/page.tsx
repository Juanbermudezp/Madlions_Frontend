import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarCobros } from '@/app/actions/pagos';
import { MisPagos } from '@/components/pagos/mis-pagos';

export const metadata: Metadata = { title: 'Mis pagos | Madlions' };

/** FE-12.1: cobros pendientes y pagados del miembro autenticado. */
export default async function Page() {
  const inicial = await listarCobros('PENDIENTE');
  if (!inicial.ok && inicial.error.startsWith('Tu sesión expiró')) redirect('/login');

  return <MisPagos inicial={inicial} />;
}
