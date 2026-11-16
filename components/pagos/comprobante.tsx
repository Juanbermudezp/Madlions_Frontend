'use client';

import Link from 'next/link';
import { ETIQUETA_CONCEPTO, fechaHoraDePago, type Comprobante } from '@/lib/pagos';
import { formatearPrecio } from '@/lib/planes';
import { botonPrimarioCss } from '@/components/clases/estilos';

/**
 * Al imprimir se ocultan el menú, el encabezado y los botones de la app: solo
 * queda el comprobante. El estilo vive en esta página, no en el CSS global.
 */
const ESTILO_IMPRESION = `
@media print {
  aside, header, .no-imprimir { display: none !important; }
  main { padding: 0 !important; }
  body { background: #fff !important; color: #000 !important; }
}`;

/** FE-12.2: comprobante de un pago aprobado, con el botón Imprimir. */
export function ComprobanteVista({ comprobante }: { comprobante: Comprobante }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <style>{ESTILO_IMPRESION}</style>

      <div className="no-imprimir flex flex-wrap items-center justify-between gap-3">
        <Link href="/miembro/pagos" className="text-sm underline underline-offset-2">
          ← Mis pagos
        </Link>
        <button type="button" className={botonPrimarioCss} onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <article
        aria-labelledby="comprobante-titulo"
        className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800 print:border-zinc-400"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <p className="text-lg font-semibold tracking-tight">Madlions</p>
            <h1 id="comprobante-titulo" className="text-sm text-zinc-600 dark:text-zinc-400">
              Comprobante de pago
            </h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold">{comprobante.numero}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{fechaHoraDePago(comprobante.emitidoEn)}</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Miembro" valor={`${comprobante.miembro.nombre} (${comprobante.miembro.codigo})`} />
          <Dato etiqueta="Número de transacción" valor={comprobante.referencia} mono />
          <Dato etiqueta="Concepto" valor={ETIQUETA_CONCEPTO[comprobante.concepto]} />
          <Dato etiqueta="Detalle" valor={comprobante.detalle} />
          <Dato etiqueta="Tarjeta" valor={`•••• ${comprobante.ultimos4}`} mono />
        </dl>

        <dl className="mt-6 ml-auto flex w-full max-w-xs flex-col gap-1 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
          <Monto etiqueta="Subtotal" valor={comprobante.subtotal} />
          <Monto etiqueta="IVA (13 %)" valor={comprobante.iva} />
          <Monto etiqueta="Total" valor={comprobante.total} total />
        </dl>
      </article>
    </div>
  );
}

function Dato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{etiqueta}</dt>
      <dd className={`mt-0.5 font-medium ${mono ? 'font-mono' : ''}`}>{valor}</dd>
    </div>
  );
}

function Monto({ etiqueta, valor, total = false }: { etiqueta: string; valor: number; total?: boolean }) {
  return (
    <div className={`flex justify-between ${total ? 'mt-1 border-t border-zinc-200 pt-2 text-base font-semibold dark:border-zinc-800' : ''}`}>
      <dt>{etiqueta}</dt>
      <dd>{formatearPrecio(valor)}</dd>
    </div>
  );
}
