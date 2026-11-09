import type { Metadata } from 'next';
import { PaginaAgenda } from '@/components/clases/pagina-agenda';

export const metadata: Metadata = { title: 'Agenda de clases | Madlions' };

/** H4: agenda semanal en modo de solo lectura. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string | string[] }>;
}) {
  const { semana } = await searchParams;
  return (
    <PaginaAgenda
      semana={typeof semana === 'string' ? semana : undefined}
      rutaBase="/entrenador/clases"
      editable={false}
    />
  );
}
