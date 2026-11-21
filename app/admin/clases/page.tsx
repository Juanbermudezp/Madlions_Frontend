import type { Metadata } from 'next';
import { PaginaAgenda } from '@/components/clases/pagina-agenda';

export const metadata: Metadata = { title: 'Clases | Madlions' };

/** FE-4.2: agenda semanal del administrador, con alta y modificación de clases. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string | string[] }>;
}) {
  const { semana } = await searchParams;
  return (
    <PaginaAgenda
      semana={typeof semana === 'string' ? semana : undefined}
      rutaBase="/admin/clases"
      editable
    />
  );
}
