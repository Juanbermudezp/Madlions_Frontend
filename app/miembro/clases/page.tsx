import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarClasesReservables } from '@/app/actions/reservas';
import { ClasesDeLaSemana } from '@/components/reservas/clases-semana';

export const metadata: Metadata = { title: 'Clases de la semana | Madlions' };

/** FE-5.1: clases reservables de la semana actual (la siguiente se pide al cambiar de pestaña). */
export default async function Page() {
  const inicial = await listarClasesReservables('actual');
  if (!inicial.ok && inicial.error.startsWith('Tu sesión expiró')) redirect('/login');

  return <ClasesDeLaSemana inicial={inicial} />;
}
