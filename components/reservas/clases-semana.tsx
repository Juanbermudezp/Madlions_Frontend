'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { listarClasesReservables, reservarClase } from '@/app/actions/reservas';
import { etiquetaDiaLarga, etiquetaSemana, fechaLocal, horaLocal } from '@/lib/clases';
import {
  MENSAJES_RESERVAS,
  agruparPorDia,
  colorLugares,
  lunesDeSemana,
  textoLugares,
  type ClaseReservable,
  type ResultadoLista,
  type SemanaReservable,
} from '@/lib/reservas';
import { botonPrimarioCss, botonSecundarioCss } from '@/components/clases/estilos';
import { Modal } from '@/components/clases/modal';
import { Notificacion } from '@/components/clases/notificacion';
import { EstadoVacio } from './estado-vacio';

const SEMANAS: { semana: SemanaReservable; etiqueta: string }[] = [
  { semana: 'actual', etiqueta: 'Esta semana' },
  { semana: 'siguiente', etiqueta: 'Semana siguiente' },
];

const horario = (clase: { inicio: string; fin: string }) => `${horaLocal(clase.inicio)} – ${horaLocal(clase.fin)}`;

/** FE-5.1: clases de la semana con su detalle y la confirmación de la reserva. */
export function ClasesDeLaSemana({ inicial }: { inicial: ResultadoLista<ClaseReservable> }) {
  const [semana, setSemana] = useState<SemanaReservable>('actual');
  const [resultados, setResultados] = useState<Partial<Record<SemanaReservable, ResultadoLista<ClaseReservable>>>>({
    actual: inicial,
  });
  const [cargando, iniciar] = useTransition();
  const [elegida, setElegida] = useState<ClaseReservable | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clave: number } | null>(null);
  // Evita mostrar la respuesta de una semana vieja si el miembro cambió rápido.
  const ultima = useRef(0);

  const cargar = useCallback((cual: SemanaReservable) => {
    const consulta = ++ultima.current;
    iniciar(async () => {
      const resultado = await listarClasesReservables(cual);
      if (consulta === ultima.current) setResultados((previos) => ({ ...previos, [cual]: resultado }));
    });
  }, []);

  function elegirSemana(cual: SemanaReservable) {
    setSemana(cual);
    setResultados((previos) => ({ ...previos, [cual]: undefined }));
    cargar(cual);
  }

  /** Tras reservar, la tarjeta pasa a "Reservada" con los lugares que devolvió el backend. */
  function marcarReservada(claseId: string, lugaresDisponibles: number) {
    setResultados((previos) => {
      const actual = previos[semana];
      if (!actual?.ok) return previos;
      const datos = actual.datos.map((c) => (c.id === claseId ? { ...c, yaReservada: true, lugaresDisponibles } : c));
      return { ...previos, [semana]: { ok: true, datos } };
    });
    setElegida(null);
    setAviso({ texto: MENSAJES_RESERVAS.confirmada, clave: Date.now() });
  }

  const cerrarAviso = useCallback(() => setAviso(null), []);
  const resultado = resultados[semana];

  return (
    <div className="@container flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clases de la semana</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Elige una clase y reserva tu lugar. Puedes cancelar hasta 2 horas antes del inicio.
          </p>
        </div>
        <Link href="/miembro/reservas" className={botonSecundarioCss}>
          Mis reservas
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Semana"
          className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {SEMANAS.map(({ semana: cual, etiqueta }) => {
            const activa = cual === semana;
            return (
              <button
                key={cual}
                type="button"
                role="tab"
                id={`semana-${cual}`}
                aria-selected={activa}
                aria-controls="panel-clases"
                onClick={() => !activa && elegirSemana(cual)}
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
        <p className="text-sm text-zinc-500">{etiquetaSemana(lunesDeSemana(semana))}</p>
      </div>

      <div role="tabpanel" id="panel-clases" aria-labelledby={`semana-${semana}`} aria-busy={cargando} className="flex flex-1 flex-col">
        {!resultado || cargando ? (
          <CargandoLista />
        ) : !resultado.ok ? (
          <ErrorLista mensaje={resultado.error} onReintentar={() => cargar(semana)} />
        ) : resultado.datos.length === 0 ? (
          <EstadoVacio
            mensaje={MENSAJES_RESERVAS.sinClases}
            detalle={
              semana === 'actual'
                ? 'Revisa la semana siguiente o vuelve más tarde.'
                : 'Aún no hay clases publicadas para la semana siguiente.'
            }
          >
            {semana === 'actual' && (
              <button type="button" onClick={() => elegirSemana('siguiente')} className={botonSecundarioCss}>
                Ver semana siguiente
              </button>
            )}
          </EstadoVacio>
        ) : (
          // Columnas automáticas: un solo día ocupa todo el ancho; con más días se reparten
          // en columnas de al menos 28rem según el espacio disponible.
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,28rem),1fr))] items-start gap-x-8 gap-y-8">
            {agruparPorDia(resultado.datos).map(({ fecha, clases }) => (
              <section key={fecha} aria-label={etiquetaDiaLarga(fecha)} className="min-w-0">
                <div className="mb-3 flex items-baseline justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                  <h2 className="text-base font-semibold first-letter:uppercase">{etiquetaDiaLarga(fecha)}</h2>
                  <span className="text-xs text-zinc-500">
                    {clases.length === 1 ? '1 clase' : `${clases.length} clases`}
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {clases.map((clase) => (
                    <TarjetaClase key={clase.id} clase={clase} onAbrir={() => setElegida(clase)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {elegida && (
        <DetalleClase
          key={elegida.id}
          clase={elegida}
          onCerrar={() => setElegida(null)}
          onReservada={marcarReservada}
          onClaseLlena={() => cargar(semana)}
        />
      )}

      {aviso && <Notificacion key={aviso.clave} mensaje={aviso.texto} onCerrar={cerrarAviso} />}
    </div>
  );
}

function Etiqueta({ texto, css }: { texto: string; css: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${css}`}>{texto}</span>;
}

const CSS_RESERVADA = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';

function TarjetaClase({ clase, onAbrir }: { clase: ClaseReservable; onAbrir: () => void }) {
  const llena = clase.lugaresDisponibles === 0;
  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`${clase.tipo.nombre}, ${horario(clase)}, ${clase.entrenador.nombre}`}
        className={`group flex w-full items-stretch gap-3 rounded-xl sm:gap-4 border bg-white p-4 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md dark:bg-zinc-900/60 ${
          clase.yaReservada
            ? 'border-emerald-300 dark:border-emerald-900'
            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
        }`}
      >
        <div className="flex w-14 shrink-0 flex-col items-center justify-center border-r border-zinc-200 pr-3 sm:w-16 sm:pr-4 dark:border-zinc-800">
          <span className="text-lg font-semibold tabular-nums">{horaLocal(clase.inicio)}</span>
          <span className="text-xs tabular-nums text-zinc-500">{horaLocal(clase.fin)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="truncate font-semibold">{clase.tipo.nombre}</p>
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{clase.entrenador.nombre}</p>
          <p className="sr-only">{horario(clase)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center gap-1.5">
          {clase.yaReservada && <Etiqueta texto={MENSAJES_RESERVAS.reservada} css={CSS_RESERVADA} />}
          {llena ? (
            !clase.yaReservada && <Etiqueta texto={MENSAJES_RESERVAS.llena} css={colorLugares(0)} />
          ) : (
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${colorLugares(clase.lugaresDisponibles)}`}
            >
              {/* En pantallas angostas se acorta para no cortar el nombre del entrenador. */}
              <span className="sm:hidden" aria-hidden>
                {clase.lugaresDisponibles === 1 ? '1 lugar' : `${clase.lugaresDisponibles} lugares`}
              </span>
              <span className="hidden sm:inline">{textoLugares(clase.lugaresDisponibles)}</span>
            </span>
          )}
        </div>
        <span aria-hidden className="hidden self-center text-xl text-zinc-400 transition group-hover:translate-x-0.5 sm:block">
          ›
        </span>
      </button>
    </li>
  );
}

function DetalleClase({
  clase,
  onCerrar,
  onReservada,
  onClaseLlena,
}: {
  clase: ClaseReservable;
  onCerrar: () => void;
  onReservada: (claseId: string, lugaresDisponibles: number) => void;
  onClaseLlena: () => void;
}) {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState('');
  const llena = clase.lugaresDisponibles === 0;

  function reservar() {
    setError('');
    iniciar(async () => {
      const resultado = await reservarClase(clase.id);
      if (resultado.ok) {
        onReservada(clase.id, resultado.lugaresDisponibles);
        return;
      }
      setError(resultado.error);
      // Otro miembro tomó el último lugar: la lista se vuelve a pedir para que la tarjeta diga "Llena".
      if (resultado.error.startsWith('La clase está llena')) onClaseLlena();
    });
  }

  return (
    <Modal titulo={clase.tipo.nombre} abierto bloqueado={enviando} onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800/60">
          <div className="flex flex-col items-center border-r border-zinc-300 pr-4 dark:border-zinc-700">
            <span className="text-xl font-semibold tabular-nums">{horaLocal(clase.inicio)}</span>
            <span className="text-xs tabular-nums text-zinc-500">{horaLocal(clase.fin)}</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium first-letter:uppercase">{etiquetaDiaLarga(fechaLocal(clase.inicio))}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{horario(clase)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-zinc-500">Clase</dt>
          <dd className="font-medium">{clase.tipo.nombre}</dd>
          <dt className="text-zinc-500">Entrenador</dt>
          <dd>{clase.entrenador.nombre}</dd>
          <dt className="text-zinc-500">Lugares</dt>
          <dd>
            <Etiqueta
              texto={llena ? 'Sin lugares disponibles' : textoLugares(clase.lugaresDisponibles)}
              css={colorLugares(clase.lugaresDisponibles)}
            />
          </dd>
        </dl>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {clase.yaReservada && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            Ya reservaste esta clase
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} disabled={enviando} className={botonSecundarioCss}>
            Cerrar
          </button>
          {!clase.yaReservada && (
            <button type="button" onClick={reservar} disabled={enviando || llena} className={botonPrimarioCss}>
              {enviando ? 'Reservando…' : llena ? MENSAJES_RESERVAS.llena : 'Reservar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CargandoLista() {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-sm text-zinc-500">Cargando…</p>
      <div className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

function ErrorLista({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm text-red-700 dark:text-red-300">No se pudieron cargar las clases. {mensaje}</p>
      <button type="button" onClick={onReintentar} className={`${botonPrimarioCss} mt-4`}>
        Reintentar
      </button>
    </div>
  );
}
