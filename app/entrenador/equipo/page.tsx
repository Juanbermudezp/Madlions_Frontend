import type { Metadata } from 'next';
import { PaginaEquipo } from '@/components/equipo/pagina-equipo';
import { filtrosDesdeParams, type ParametrosFiltro } from '@/lib/maquinas';

export const metadata: Metadata = { title: 'Estado del equipo | Madlions' };

// FE-17.1: estado del equipo, vista del entrenador.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ParametrosFiltro>;
}) {
  return (
    <PaginaEquipo filtros={filtrosDesdeParams(await searchParams)} rutaBase="/entrenador/equipo" />
  );
}
