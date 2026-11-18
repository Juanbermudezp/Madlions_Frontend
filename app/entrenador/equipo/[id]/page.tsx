import type { Metadata } from 'next';
import { PaginaDetalleMaquina } from '@/components/equipo/pagina-detalle-maquina';

export const metadata: Metadata = { title: 'Detalle de la máquina | Madlions' };

// FE-18.1: detalle de una máquina con su historial.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaginaDetalleMaquina id={id} rutaBase="/entrenador/equipo" />;
}
