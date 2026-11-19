import type { Metadata } from 'next';
import { MisRutinas } from '@/components/rutinas-propias/mis-rutinas';

export const metadata: Metadata = { title: 'Mis rutinas | Madlions' };

// Los datos se consultan al montar la vista, nunca desde una precarga de navegación.
export default function Page() {
  return <MisRutinas />;
}
