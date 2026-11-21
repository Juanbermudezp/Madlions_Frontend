import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarMisAvisos } from '@/app/actions/avisos';
import { BandejaAvisos } from '@/components/avisos/bandeja-avisos';

export const metadata: Metadata = { title: 'Mis avisos | Madlions' };

/** FE-23.1: bandeja del miembro autenticado; abre en la página 1 con todos los avisos. */
export default async function Page() {
  const inicial = await listarMisAvisos(1, 'todos');
  if (!inicial.ok && inicial.error.startsWith('Tu sesión expiró')) redirect('/login');

  return <BandejaAvisos inicial={inicial} />;
}
