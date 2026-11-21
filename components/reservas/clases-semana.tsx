'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { listarClasesReservables, reservarClase } from '@/app/actions/reservas';
import { diasDeLaSemana, etiquetaDiaLarga, etiquetaSemana, fechaLocal, horaLocal, hoyLocal } from '@/lib/clases';
import { ESTILO_DISPONIBILIDAD, colorDeTipo, nivelDisponibilidad } from '@/lib/estilo-clases';
import {
  MENSAJES_RESERVAS,
  agruparPorDia,
  colorLugares,
  lunesDeSemana,
  partesDeFecha,
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

/** Créditos del set del miembro (H3), para el contador del encabezado. null si su plan no es un set. */
export interface CreditosMiembro {
  disponibles: number;
  totales: number;
}

/** Día que se marca al abrir una semana: hoy si está en ella; si no, el primero con clases. */
function diaInicial(semana: SemanaReservable, clases: ClaseReservable[] = []): string {
  const dias = diasDeLaSemana(lunesDeSemana(semana));
  const hoy = hoyLocal();
  if (dias.includes(hoy)) return hoy;
  const conClases = new Set(clases.map((c) => fechaLocal(c.inicio)));
  return dias.find((dia) => conClases.has(dia)) ?? dias[0];
}

/**
 * FE-5.1: clases de la semana con su detalle y la confirmación de la reserva.
 * Rediseño (H7): tira de días con el día elegido resaltado (las demás clases
 * de la semana siguen a la vista), colores de disponibilidad por cupo y el
 * contador de créditos del set.
 */
export function ClasesDeLaSemana({
  inicial,
  creditos = null,
}: {
  inicial: ResultadoLista<ClaseReservable>;
  creditos?: CreditosMiembro | null;
}) {
  const [semana, setSemana] = useState<SemanaReservable>('actual');
  const [resultados, setResultados] = useState<Partial<Record<SemanaReservable, ResultadoLista<ClaseReservable>>>>({
    actual: inicial,
  });
  const [cargando, iniciar] = useTransition();
  const [elegida, setElegida] = useState<ClaseReservable | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clave: number } | null>(null);
  const [diaElegido, setDiaElegido] = useState(() => diaInicial('actual', inicial.ok ? inicial.datos : []));
  // Evita mostrar la respuesta de una semana vieja si el miembro cambió rápido.
  const ultima = useRef(0);

  const cargar = useCallback((cual: SemanaReservable) => {
    const consulta = ++ultima.current;
    iniciar(async () => {
      const resultado = await listarClasesReservables(cual);
      if (consulta !== ultima.current) return;
      setResultados((previos) => ({ ...previos, [cual]: resultado }));
      if (cual === 'siguiente') setDiaElegido(diaInicial(cual, resultado.ok ? resultado.datos : []));
    });
  }, []);

  function elegirSemana(cual: SemanaReservable) {
    setSemana(cual);
    setDiaElegido(diaInicial(cual));
    setResultados((previos) => ({ ...previos, [cual]: undefined }));
    cargar(cual);
  }

  function elegirDia(fecha: string) {
    setDiaElegido(fecha);
    // Lleva la vista al día elegido; las clases de los demás días siguen en la página.
    document.getElementById(`dia-${fecha}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
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
  const hoy = hoyLocal();

  return (
    <div className="@container mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Clases de la semana</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Elige una clase y reserva tu lugar. Puedes cancelar hasta 2 horas antes del inicio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {creditos && (
            <p className="flex items-baseline gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className="text-zinc-600 dark:text-zinc-400">Te quedan</span>
              <span className="text-xl font-bold tabular-nums">{creditos.disponibles}</span>
              <span className="text-zinc-600 dark:text-zinc-400">de {creditos.totales} clases</span>
            </p>
          )}
          <Link href="/miembro/reservas" className={botonSecundarioCss}>
            Mis reservas
          </Link>
        </div>
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
                    ? 'bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
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

      <div role="tabpanel" id="panel-clases" aria-labelledby={`semana-${semana}`} aria-busy={cargando} className="flex flex-1 flex-col gap-6">
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
          <>
            <TiraDeDias
              dias={diasDeLaSemana(lunesDeSemana(semana))}
              hoy={hoy}
              clases={resultado.datos}
              elegido={diaElegido}
              onElegir={elegirDia}
            />
            {agruparPorDia(resultado.datos).map(({ fecha, clases }) => (
              <SeccionDia
                key={fecha}
                fecha={fecha}
                hoy={hoy}
                clases={clases}
                destacada={fecha === diaElegido}
                onAbrir={setElegida}
              />
            ))}
          </>
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

/** Los 7 días de la semana con cuántas clases tiene cada uno. Los días pasados quedan desactivados. */
function TiraDeDias({
  dias,
  hoy,
  clases,
  elegido,
  onElegir,
}: {
  dias: string[];
  hoy: string;
  clases: ClaseReservable[];
  elegido: string;
  onElegir: (fecha: string) => void;
}) {
  const porDia = new Map<string, number>();
  for (const clase of clases) {
    const fecha = fechaLocal(clase.inicio);
    porDia.set(fecha, (porDia.get(fecha) ?? 0) + 1);
  }

  return (
    <div role="group" aria-label="Días de la semana" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {dias.map((fecha) => {
        const { diaSemana, dia } = partesDeFecha(fecha);
        const n = porDia.get(fecha) ?? 0;
        const pasado = fecha < hoy;
        const activo = fecha === elegido;
        const resumen = pasado ? 'pasado' : n === 0 ? 'sin clases' : n === 1 ? '1 clase' : `${n} clases`;
        return (
          <button
            key={fecha}
            type="button"
            disabled={pasado}
            aria-pressed={activo}
            aria-label={`${etiquetaDiaLarga(fecha)}, ${resumen}`}
            onClick={() => onElegir(fecha)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3 transition-colors ${
              activo
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : pasado
                  ? 'cursor-not-allowed border-zinc-100 text-zinc-400 dark:border-zinc-900 dark:text-zinc-600'
                  : `bg-white hover:border-zinc-400 dark:bg-zinc-900/60 dark:hover:border-zinc-600 ${
                      fecha === hoy ? 'border-zinc-400 dark:border-zinc-500' : 'border-zinc-200 dark:border-zinc-800'
                    }`
            }`}
          >
            <span className="text-xs uppercase tracking-wide">{fecha === hoy ? 'hoy' : diaSemana}</span>
            <span className="text-xl font-semibold tabular-nums">{dia}</span>
            <span className="text-xs">{resumen}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Clases de un día. El día elegido va dentro de un panel destacado; los demás, debajo y sin resaltar. */
function SeccionDia({
  fecha,
  hoy,
  clases,
  destacada,
  onAbrir,
}: {
  fecha: string;
  hoy: string;
  clases: ClaseReservable[];
  destacada: boolean;
  onAbrir: (clase: ClaseReservable) => void;
}) {
  return (
    <section
      id={`dia-${fecha}`}
      aria-label={etiquetaDiaLarga(fecha)}
      aria-current={destacada ? 'date' : undefined}
      className={`flex scroll-mt-6 flex-col gap-4 ${
        destacada
          ? 'rounded-2xl border border-zinc-300 bg-zinc-50 p-4 shadow-xl shadow-zinc-900/5 sm:p-5 dark:border-zinc-600 dark:bg-zinc-900/80 dark:shadow-black/40'
          : 'px-1 sm:px-5'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className={`font-semibold first-letter:uppercase ${destacada ? 'text-xl' : 'text-base'}`}>
          {fecha === hoy ? 'Hoy' : etiquetaDiaLarga(fecha)}
          {fecha === hoy && <span className="font-normal text-zinc-500"> · {etiquetaDiaLarga(fecha)}</span>}
        </h2>
        {destacada && (
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            Día seleccionado
          </span>
        )}
        <span className="text-xs text-zinc-500">{clases.length === 1 ? '1 clase' : `${clases.length} clases`}</span>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
        {clases.map((clase) => (
          <TarjetaClase key={clase.id} clase={clase} destacada={destacada} onAbrir={() => onAbrir(clase)} />
        ))}
      </ul>
    </section>
  );
}

function Etiqueta({ texto, css }: { texto: string; css: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${css}`}>{texto}</span>;
}

const CSS_RESERVADA = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';

/** Tarjeta de una clase: el color de la etiqueta y de la barra depende de los lugares libres. */
function TarjetaClase({
  clase,
  destacada,
  onAbrir,
}: {
  clase: ClaseReservable;
  destacada: boolean;
  onAbrir: () => void;
}) {
  const libres = clase.lugaresDisponibles;
  const llena = libres === 0;
  const nivel = ESTILO_DISPONIBILIDAD[nivelDisponibilidad(libres, clase.cupoMaximo)];
  const ocupados = clase.cupoMaximo ? clase.cupoMaximo - libres : null;

  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`${clase.tipo.nombre}, ${horario(clase)}, ${clase.entrenador.nombre}`}
        className={`group flex h-full w-full flex-col gap-4 rounded-xl border p-4 text-left transition hover:-translate-y-px hover:shadow-md ${
          destacada
            ? 'border-zinc-900 bg-white shadow-md ring-4 ring-zinc-900/5 dark:border-zinc-200 dark:bg-zinc-800/70 dark:ring-white/10'
            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xl font-semibold tabular-nums">{horaLocal(clase.inicio)}</p>
            <p className="font-mono text-xs tabular-nums text-zinc-500">hasta {horaLocal(clase.fin)}</p>
          </div>
          <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorDeTipo(clase.tipo).chip}`}>
            {clase.tipo.nombre}
          </span>
        </div>
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">con {clase.entrenador.nombre}</p>
        <p className="sr-only">{horario(clase)}</p>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${nivel.pildora}`}>
              <span aria-hidden className={`size-2 rounded-full ${nivel.punto}`} />
              {nivel.texto}
            </span>
            {!llena && <span className="text-xs text-zinc-600 dark:text-zinc-400">{textoLugares(libres)}</span>}
            {llena && ocupados !== null && (
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {ocupados} de {clase.cupoMaximo} ocupados
              </span>
            )}
          </div>
          {ocupados !== null && clase.cupoMaximo ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className={`h-full rounded-full ${nivel.barra}`} style={{ width: `${Math.round((ocupados / clase.cupoMaximo) * 100)}%` }} />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          {clase.yaReservada ? (
            <Etiqueta texto={MENSAJES_RESERVAS.reservada} css={CSS_RESERVADA} />
          ) : llena ? (
            <span className="text-xs text-zinc-500">Sin lugares disponibles</span>
          ) : (
            <span className="text-sm font-medium">Reservar</span>
          )}
          <span aria-hidden className="text-xl text-zinc-400 transition group-hover:translate-x-0.5">
            ›
          </span>
        </div>
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
