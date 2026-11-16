'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { listarCobros } from '@/app/actions/pagos';
import {
  ETIQUETA_CONCEPTO,
  MENSAJES_PAGOS,
  fechaDePago,
  rutaComprobante,
  rutaPagar,
  type Cobro,
  type EstadoCobro,
  type ResultadoCobros,
} from '@/lib/pagos';
import { formatearPrecio } from '@/lib/planes';
import { botonPrimarioCss } from '@/components/clases/estilos';

const PESTANAS: { estado: EstadoCobro; etiqueta: string }[] = [
  { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
  { estado: 'PAGADO', etiqueta: 'Pagados' },
];

/** FE-12.1: "Mis pagos" con las pestañas Pendientes y Pagados. */
export function MisPagos({ inicial }: { inicial: ResultadoCobros }) {
  const [pestana, setPestana] = useState<EstadoCobro>('PENDIENTE');
  const [resultados, setResultados] = useState<Partial<Record<EstadoCobro, ResultadoCobros>>>({
    PENDIENTE: inicial,
  });
  const [cargando, iniciar] = useTransition();
  // Evita mostrar la respuesta de una pestaña vieja si el miembro cambió rápido.
  const ultima = useRef(0);

  function cargar(estado: EstadoCobro) {
    const consulta = ++ultima.current;
    iniciar(async () => {
      const resultado = await listarCobros(estado);
      if (consulta === ultima.current) setResultados((previos) => ({ ...previos, [estado]: resultado }));
    });
  }

  function elegir(estado: EstadoCobro) {
    setPestana(estado);
    // Cada pestaña consulta la API con su estado al abrirse.
    setResultados((previos) => ({ ...previos, [estado]: undefined }));
    cargar(estado);
  }

  const resultado = resultados[pestana];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Mis pagos</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Paga tu membresía, tus renovaciones y tus sesiones adicionales.
        </p>
      </div>

      <div role="tablist" aria-label="Estado de los cobros" className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {PESTANAS.map(({ estado, etiqueta }) => {
          const activa = estado === pestana;
          return (
            <button
              key={estado}
              type="button"
              role="tab"
              id={`pestana-${estado}`}
              aria-selected={activa}
              aria-controls="panel-cobros"
              onClick={() => !activa && elegir(estado)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
                activa
                  ? 'border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="panel-cobros" aria-labelledby={`pestana-${pestana}`} aria-busy={cargando}>
        {!resultado || cargando ? (
          <CargandoLista />
        ) : !resultado.ok ? (
          <ErrorLista mensaje={resultado.error} onReintentar={() => cargar(pestana)} />
        ) : resultado.cobros.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            {pestana === 'PENDIENTE' ? MENSAJES_PAGOS.sinPendientes : MENSAJES_PAGOS.sinPagados}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {resultado.cobros.map((cobro) =>
              pestana === 'PENDIENTE' ? (
                <CobroPendiente key={cobro.id} cobro={cobro} />
              ) : (
                <CobroPagado key={cobro.id} cobro={cobro} />
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function CobroPendiente({ cobro }: { cobro: Cobro }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="min-w-0">
        <p className="font-medium">{ETIQUETA_CONCEPTO[cobro.concepto]}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{cobro.detalle}</p>
        <p className="mt-1 text-lg font-semibold">
          {formatearPrecio(cobro.monto)} <span className="text-xs font-normal text-zinc-500">IVA incluido</span>
        </p>
        {!cobro.habilitado && cobro.habilitadoDesde && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{MENSAJES_PAGOS.noHabilitado(cobro.habilitadoDesde)}</p>
        )}
      </div>
      {cobro.habilitado ? (
        <Link href={rutaPagar(cobro.id)} className={`${botonPrimarioCss} w-full text-center sm:w-auto`}>
          Pagar
        </Link>
      ) : (
        // Una renovación no habilitada no se puede iniciar: botón deshabilitado, sin enlace.
        <button type="button" disabled className={`${botonPrimarioCss} w-full cursor-not-allowed sm:w-auto`}>
          Pagar
        </button>
      )}
    </li>
  );
}

function CobroPagado({ cobro }: { cobro: Cobro }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="min-w-0">
        <p className="font-medium">{ETIQUETA_CONCEPTO[cobro.concepto]}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatearPrecio(cobro.monto)}
          {cobro.pagadoEn && ` · Pagado el ${fechaDePago(cobro.pagadoEn)}`}
        </p>
      </div>
      {cobro.comprobanteNumero && (
        <Link
          href={rutaComprobante(cobro.comprobanteNumero)}
          className="text-sm font-medium underline underline-offset-2"
        >
          Ver comprobante
        </Link>
      )}
    </li>
  );
}

function CargandoLista() {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-sm text-zinc-500">Cargando…</p>
      <div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

function ErrorLista({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm text-red-700 dark:text-red-300">No se pudieron cargar tus pagos. {mensaje}</p>
      <button type="button" onClick={onReintentar} className={`${botonPrimarioCss} mt-4`}>
        Reintentar
      </button>
    </div>
  );
}
