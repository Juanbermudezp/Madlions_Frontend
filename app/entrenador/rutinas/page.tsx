import type { Metadata } from 'next';
import { listarRutinas } from '@/app/actions/rutinas';
import { Rutinas } from '@/components/rutinas/rutinas';

export const metadata: Metadata = { title: 'Rutinas | Madlions' };

export default async function Page() {
  return <Rutinas inicial={await listarRutinas()} />;
}
