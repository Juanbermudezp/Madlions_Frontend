import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccesoDenegadoError, api, ApiError, SesionInvalidaError } from '@/lib/api';
import type { Comprobante } from '@/lib/pagos';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { ComprobanteVista } from '@/components/pagos/comprobante';

export const metadata: Metadata = { title: 'Comprobante | Madlions' };

/** FE-12.2: comprobante de un pago aprobado del miembro autenticado. */
export default async function Page({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  let comprobante: Comprobante | null = null;
  let aviso = '';
  let error = '';
  let sesionVencida = false;

  try {
    comprobante = await api<Comprobante>(`comprobantes/${encodeURIComponent(numero)}`);
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    // 403 (de otro miembro) y 404 (no existe): mensaje de la API, sin reintentar.
    else if (e instanceof AccesoDenegadoError || (e instanceof ApiError && e.estado === 404)) aviso = e.message;
    else error = e instanceof Error ? e.message : '';
  }

  if (sesionVencida) redirect('/login');
  if (aviso) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {aviso}
        </p>
        <Link href="/miembro/pagos" className="text-sm font-medium underline underline-offset-2">
          Volver a Mis pagos
        </Link>
      </div>
    );
  }
  if (!comprobante) return <ErrorCarga mensaje={`No se pudo cargar el comprobante. ${error}`} />;

  return <ComprobanteVista comprobante={comprobante} />;
}
