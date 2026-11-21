'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { cancelarReserva, listarMisReservas } from '@/app/actions/reservas';
import { etiquetaDiaLarga, fechaLocal, horaLocal } from '@/lib/clases';
import {
  COLOR_ESTADO_RESERVA,
  ETIQUETA_ESTADO_RESERVA,
  MENSAJES_RESERVAS,
  partesDeFecha,
  preguntaCancelacion,
  puedeCancelar,
  type MiReserva,
  type PestanaReservas,
  type ResultadoLista,
} from '@/lib/reservas';
import { botonPrimarioCss, botonSecundarioCss } from '@/components/clases/estilos';
import { Modal } from '@/components/clases/modal';
import { Notificacion } from '@/components/clases/notificacion';
import { EstadoVacio } from './estado-vacio';

const PESTANAS: { pestana: PestanaReservas; etiqueta: string }[] = [
  { pestana: 'proximas', etiqueta: 'Próximas' },
  { pestana: 'pasadas', etiqueta: 'Pasadas' },
];

/** Rechazos del backend que significan que la tarjeta quedó desactualizada (BE-6.1). */
const RECHAZOS_QUE_RECARGAN = ['Esta reserva ya fue cancelada', 'Solo puedes cancelar hasta 2 horas'];

/**
 * FE-5.2: reservas del miembro en las pestañas Próximas y Pasadas.
 * FE-6.1: botón Cancelar en las reservas confirmadas de Próximas que empiezan en 2 horas o más.
 */
export function MisReservas({ inicial }: { inicial: ResultadoLista<MiReserva> }) {
  const [pestana, setPestana] = useState<PestanaReservas>('proximas');
  const [resultados, setResultados] = useState<Partial<Record<PestanaReservas, ResultadoLista<MiReserva>>>>({
    proximas: inicial,
  });
  const [cargando, iniciar] = useTransition();
  const [porCancelar, setPorCancelar] = useState<MiReserva | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clave: number } | null>(null);
  const ultima = useRef(0);

  function cargar(cual: PestanaReservas) {
    const consulta = ++ultima.current;
    iniciar(async () => {
      const resultado = await listarMisReservas(cual);
      if (consulta === ultima.current) setResultados((previos) => ({ ...previos, [cual]: resultado }));
    });
  }

  function elegir(cual: PestanaReservas) {
    setPestana(cual);
    // Cada pestaña consulta la API al abrirse.
    setResultados((previos) => ({ ...previos, [cual]: undefined }));
    cargar(cual);
  }

  /** Tras cancelar, la tarjeta cambia su etiqueta a "Cancelada por el miembro" sin recargar la lista. */
  function marcarCancelada(reservaId: string) {
    setResultados((previos) => {
      const proximas = previos.proximas;
      if (!proximas?.ok) return previos;
      const datos = proximas.datos.map((r) => (r.id === reservaId ? { ...r, estado: 'CANCELADA_MIEMBRO' as const } : r));
      return { ...previos, proximas: { ok: true, datos } };
    });
    setPorCancelar(null);
    setAviso({ texto: MENSAJES_RESERVAS.cancelada, clave: Date.now() });
  }

  const cerrarAviso = useCallback(() => setAviso(null), []);
  const cerrarModal = useCallback(() => setPorCancelar(null), []);
  const resultado = resultados[pestana];

  return (
    <div className="@container flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis reservas</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Las clases grupales que reservaste.</p>
        </div>
        <Link href="/miembro/clases" className={botonPrimarioCss}>
          Reservar una clase
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Reservas"
        className="inline-flex self-start rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {PESTANAS.map(({ pestana: cual, etiqueta }) => {
          const activa = cual === pestana;
          return (
            <button
              key={cual}
              type="button"
              role="tab"
              id={`pestana-${cual}`}
              aria-selected={activa}
              aria-controls="panel-reservas"
              onClick={() => !activa && elegir(cual)}
              className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                activa
                  ? 'bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="panel-reservas" aria-labelledby={`pestana-${pestana}`} aria-busy={cargando} className="flex flex-1 flex-col">
        {!resultado || cargando ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="text-sm text-zinc-500">Cargando…</p>
            <div className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : !resultado.ok ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
            <p className="text-sm text-red-700 dark:text-red-300">No se pudieron cargar tus reservas. {resultado.error}</p>
            <button type="button" onClick={() => cargar(pestana)} className={`${botonPrimarioCss} mt-4`}>
              Reintentar
            </button>
          </div>
        ) : resultado.datos.length === 0 ? (
          <EstadoVacio
            mensaje={MENSAJES_RESERVAS.sinReservas}
            detalle={
              pestana === 'proximas'
                ? 'Cuando reserves una clase aparecerá aquí.'
                : 'Aquí verás las clases que ya terminaron.'
            }
          >
            {pestana === 'proximas' && (
              <Link href="/miembro/clases" className={botonPrimarioCss}>
                Ver clases de la semana
              </Link>
            )}
          </EstadoVacio>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-3">
            {resultado.datos.map((reserva) => (
              <TarjetaReserva
                key={reserva.id}
                reserva={reserva}
                onCancelar={pestana === 'proximas' && puedeCancelar(reserva) ? () => setPorCancelar(reserva) : undefined}
              />
            ))}
          </ul>
        )}
      </div>

      {porCancelar && (
        <ModalCancelacion
          reserva={porCancelar}
          onCerrar={cerrarModal}
          onCancelada={marcarCancelada}
          onDesactualizada={() => cargar('proximas')}
        />
      )}
      {aviso && <Notificacion key={aviso.clave} mensaje={aviso.texto} onCerrar={cerrarAviso} />}
    </div>
  );
}

/** FE-6.1 · Confirmación "¿Cancelar tu reserva de …?" con el mensaje del backend si se rechaza. */
function ModalCancelacion({
  reserva,
  onCerrar,
  onCancelada,
  onDesactualizada,
}: {
  reserva: MiReserva;
  onCerrar: () => void;
  onCancelada: (reservaId: string) => void;
  onDesactualizada: () => void;
}) {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState('');

  function confirmar() {
    setError('');
    iniciar(async () => {
      const resultado = await cancelarReserva(reserva.id);
      if (resultado.ok) {
        onCancelada(reserva.id);
        return;
      }
      setError(resultado.error);
      // Ya estaba cancelada o se pasó el plazo: la lista se vuelve a pedir para que la tarjeta lo refleje.
      if (RECHAZOS_QUE_RECARGAN.some((motivo) => resultado.error.startsWith(motivo))) onDesactualizada();
    });
  }

  return (
    <Modal titulo="Cancelar reserva" abierto bloqueado={enviando} onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        <p className="text-sm">{preguntaCancelacion(reserva)}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tu lugar quedará libre para otro miembro. Si tu plan es un set de clases, el crédito vuelve a estar disponible.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} disabled={enviando} className={botonSecundarioCss}>
            Volver
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-60"
          >
            {enviando ? 'Cancelando…' : 'Cancelar reserva'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TarjetaReserva({ reserva, onCancelar }: { reserva: MiReserva; onCancelar?: () => void }) {
  const { clase } = reserva;
  const { diaSemana, dia, mes } = partesDeFecha(fechaLocal(clase.inicio));
  const cancelada = reserva.estado !== 'CONFIRMADA';
  return (
    <li
      className={`flex items-stretch gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 ${
        cancelada ? 'opacity-75' : ''
      }`}
    >
      <div
        aria-hidden
        className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-100 py-2 dark:bg-zinc-800"
      >
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">{diaSemana}</span>
        <span className="text-xl font-semibold leading-tight tabular-nums">{dia}</span>
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">{mes}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <p className={`truncate font-semibold ${reserva.estado === 'CANCELADA_GIMNASIO' ? 'line-through decoration-1' : ''}`}>
          {clase.tipo.nombre}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="sr-only">{etiquetaDiaLarga(fechaLocal(clase.inicio))} · </span>
          <span className="tabular-nums">
            {horaLocal(clase.inicio)} – {horaLocal(clase.fin)}
          </span>
        </p>
        <p className="truncate text-sm text-zinc-500">{clase.entrenador.nombre}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_RESERVA[reserva.estado]}`}
        >
          {ETIQUETA_ESTADO_RESERVA[reserva.estado]}
        </span>
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            aria-label={`Cancelar la reserva de ${clase.tipo.nombre}`}
            className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Cancelar
          </button>
        )}
      </div>
    </li>
  );
}
