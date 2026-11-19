import type { Metadata } from 'next';
import { DetalleRutina } from '@/components/rutinas-propias/detalle-rutina';

export const metadata: Metadata = { title: 'Detalle de rutina | Madlions' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleRutina id={id} />;
}
