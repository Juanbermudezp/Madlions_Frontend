import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarMisReservas } from '@/app/actions/reservas';
import { MisReservas } from '@/components/reservas/mis-reservas';

export const metadata: Metadata = { title: 'Mis reservas | Madlions' };

/** FE-5.2: reservas del miembro autenticado; abre en la pestaña Próximas. */
export default async function Page() {
  const inicial = await listarMisReservas('proximas');
  if (!inicial.ok && inicial.error.startsWith('Tu sesión expiró')) redirect('/login');

  return <MisReservas inicial={inicial} />;
}
