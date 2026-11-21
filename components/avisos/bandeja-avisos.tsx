'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { abrirAviso, contarAvisosNoLeidos, listarMisAvisos, marcarTodosLeidos } from '@/app/actions/avisos';
import {
  ETIQUETA_MODULO,
  fechaHoraAviso,
  MENSAJES_AVISOS,
  totalPaginas,
  type AvisoDetalle,
  type AvisoResumen,
  type FiltroAvisos,
  type ResultadoPagina,
} from '@/lib/avisos';
import { useSesion } from '@/stores/sesion';
import { botonPrimarioCss, botonSecundarioCss } from '@/components/clases/estilos';
import { Modal } from '@/components/clases/modal';
import { Notificacion } from '@/components/clases/notificacion';
import { IconoCampana, IconoModulo } from './iconos';

const FILTROS: { filtro: FiltroAvisos; etiqueta: string }[] = [
  { filtro: 'todos', etiqueta: 'Todos' },
  { filtro: 'no-leidos', etiqueta: 'No leídos' },
];

type Detalle =
  | { estado: 'cargando'; resumen: AvisoResumen }
  | { estado: 'listo'; aviso: AvisoDetalle }
  | { estado: 'error'; resumen: AvisoResumen; error: string };

/**
 * FE-23.1 · Bandeja del miembro: sus avisos de 20 en 20, del más reciente al más
 * antiguo, con los no leídos en negrita. Al abrir uno se ve el mensaje completo
 * y queda leído; el contador del menú (FE-23.2) se actualiza sin recargar.
 */
export function BandejaAvisos({ inicial }: { inicial: ResultadoPagina }) {
  const [filtro, setFiltro] = useState<FiltroAvisos>('todos');
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<ResultadoPagina | undefined>(inicial);
  const [cargando, iniciar] = useTransition();
  const [marcando, iniciarMarcado] = useTransition();
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [notificacion, setNotificacion] = useState<{ texto: string; clave: number } | null>(null);
  const [errorAccion, setErrorAccion] = useState('');
  const ultima = useRef(0);
  const noLeidos = useSesion((estado) => estado.avisosNoLeidos);
  const establecerAvisos = useSesion((estado) => estado.establecerAvisos);

  /** Pide la página y, de paso, sincroniza el contador del menú. */
  function cargar(cualPagina: number, cualFiltro: FiltroAvisos) {
    const consulta = ++ultima.current;
    setErrorAccion('');
    iniciar(async () => {
      const [nuevo, conteo] = await Promise.all([
        listarMisAvisos(cualPagina, cualFiltro),
        contarAvisosNoLeidos(),
      ]);
      if (consulta !== ultima.current) return;
      setResultado(nuevo);
      if (conteo.ok) establecerAvisos(conteo.noLeidos);
    });
  }

  function elegirFiltro(cual: FiltroAvisos) {
    setFiltro(cual);
    setPagina(1);
    setResultado(undefined);
    cargar(1, cual);
  }

  function irAPagina(cual: number) {
    setPagina(cual);
    cargar(cual, filtro);
  }

  /** Cambia el estado de las filas visibles sin volver a pedir la lista. */
  function marcarFilas(debeMarcar: (aviso: AvisoResumen) => boolean) {
    setResultado((previo) => {
      if (!previo?.ok) return previo;
      const items = previo.datos.items.map((a) => (debeMarcar(a) ? { ...a, estado: 'LEIDO' as const } : a));
      return { ok: true, datos: { ...previo.datos, items } };
    });
  }

  async function abrir(resumen: AvisoResumen) {
    setDetalle({ estado: 'cargando', resumen });
    const respuesta = await abrirAviso(resumen.id);
    if (!respuesta.ok) {
      setDetalle({ estado: 'error', resumen, error: respuesta.error });
      return;
    }
    setDetalle({ estado: 'listo', aviso: respuesta.datos });
    if (resumen.estado === 'NO_LEIDO') {
      marcarFilas((a) => a.id === resumen.id);
      establecerAvisos(Math.max(0, useSesion.getState().avisosNoLeidos - 1));
    }
  }

  function marcarTodos() {
    setErrorAccion('');
    iniciarMarcado(async () => {
      const respuesta = await marcarTodosLeidos();
      if (!respuesta.ok) {
        setErrorAccion(respuesta.error);
        return;
      }
      marcarFilas(() => true);
      establecerAvisos(0);
      setNotificacion({
        texto: respuesta.actualizados > 0 ? MENSAJES_AVISOS.todosLeidos : MENSAJES_AVISOS.nadaQueMarcar,
        clave: Date.now(),
      });
    });
  }

  const cerrarDetalle = useCallback(() => setDetalle(null), []);
  const cerrarNotificacion = useCallback(() => setNotificacion(null), []);
  const hayNoLeidosVisibles = resultado?.ok && resultado.datos.items.some((a) => a.estado === 'NO_LEIDO');

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis avisos</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Lo que te avisan las membresías, clases, sesiones y pagos, en un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cargar(pagina, filtro)}
            disabled={cargando}
            className={botonSecundarioCss}
          >
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button
            type="button"
            onClick={marcarTodos}
            disabled={marcando || (noLeidos === 0 && !hayNoLeidosVisibles)}
            className={botonPrimarioCss}
          >
            {marcando ? 'Marcando…' : 'Marcar todos como leídos'}
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Filtro de avisos"
        className="inline-flex self-start rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {FILTROS.map(({ filtro: cual, etiqueta }) => {
          const activo = cual === filtro;
          return (
            <button
              key={cual}
              type="button"
              role="tab"
              aria-selected={activo}
              aria-controls="panel-avisos"
              onClick={() => !activo && elegirFiltro(cual)}
              className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                activo
                  ? 'bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      {errorAccion && (
        <p role="alert" className="text-sm text-red-600">
          {errorAccion}
        </p>
      )}

      <div id="panel-avisos" role="tabpanel" aria-busy={cargando} className="flex flex-1 flex-col">
        {!resultado || cargando ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="text-sm text-zinc-500">Cargando…</p>
            <div className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : !resultado.ok ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
            <p className="text-sm text-red-700 dark:text-red-300">No se pudieron cargar tus avisos. {resultado.error}</p>
            <button type="button" onClick={() => cargar(pagina, filtro)} className={`${botonPrimarioCss} mt-4`}>
              Reintentar
            </button>
          </div>
        ) : resultado.datos.items.length === 0 ? (
          <BandejaVacia mensaje={filtro === 'no-leidos' ? MENSAJES_AVISOS.vacioNoLeidos : MENSAJES_AVISOS.vacio} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Título
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Módulo
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {resultado.datos.items.map((aviso) => (
                    <FilaAviso key={aviso.id} aviso={aviso} onAbrir={() => abrir(aviso)} />
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion
              pagina={resultado.datos.pagina}
              total={resultado.datos.total}
              onIr={irAPagina}
            />
          </>
        )}
      </div>

      {detalle && <PanelDetalle detalle={detalle} onCerrar={cerrarDetalle} />}
      {notificacion && (
        <Notificacion key={notificacion.clave} mensaje={notificacion.texto} onCerrar={cerrarNotificacion} />
      )}
    </div>
  );
}

function FilaAviso({ aviso, onAbrir }: { aviso: AvisoResumen; onAbrir: () => void }) {
  const sinLeer = aviso.estado === 'NO_LEIDO';
  return (
    <tr
      data-estado={aviso.estado}
      className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
        sinLeer ? 'font-semibold text-zinc-900 dark:text-zinc-50' : 'text-zinc-600 dark:text-zinc-400'
      }`}
    >
      <td className="px-4 py-3">
        <button type="button" onClick={onAbrir} className="flex w-full items-center gap-2 text-left hover:underline">
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-full ${sinLeer ? 'bg-indigo-600' : 'bg-transparent'}`}
          />
          <span>{aviso.titulo}</span>
          {sinLeer && <span className="sr-only">(sin leer)</span>}
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <IconoModulo modulo={aviso.moduloOrigen} />
          {ETIQUETA_MODULO[aviso.moduloOrigen]}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap tabular-nums">{fechaHoraAviso(aviso.creadoEn)}</td>
    </tr>
  );
}

function Paginacion({ pagina, total, onIr }: { pagina: number; total: number; onIr: (pagina: number) => void }) {
  const paginas = totalPaginas(total);
  if (paginas <= 1) return null;
  return (
    <nav aria-label="Paginación de avisos" className="mt-4 flex items-center justify-between gap-4 text-sm">
      <button type="button" onClick={() => onIr(pagina - 1)} disabled={pagina <= 1} className={botonSecundarioCss}>
        Anterior
      </button>
      <span className="text-zinc-600 dark:text-zinc-400">
        Página {pagina} de {paginas}
      </span>
      <button type="button" onClick={() => onIr(pagina + 1)} disabled={pagina >= paginas} className={botonSecundarioCss}>
        Siguiente
      </button>
    </nav>
  );
}

function PanelDetalle({ detalle, onCerrar }: { detalle: Detalle; onCerrar: () => void }) {
  const resumen = detalle.estado === 'listo' ? detalle.aviso : detalle.resumen;
  return (
    <Modal titulo={resumen.titulo} abierto onCerrar={onCerrar}>
      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
        <IconoModulo modulo={resumen.moduloOrigen} className="size-3.5" />
        {ETIQUETA_MODULO[resumen.moduloOrigen]} · {fechaHoraAviso(resumen.creadoEn)}
      </p>
      {detalle.estado === 'cargando' && (
        <p className="mt-4 text-sm text-zinc-500" aria-live="polite">
          Cargando el aviso…
        </p>
      )}
      {detalle.estado === 'error' && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {detalle.error}
        </p>
      )}
      {detalle.estado === 'listo' && (
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-zinc-800 dark:text-zinc-200">
          {detalle.aviso.mensaje}
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onCerrar} className={botonSecundarioCss}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

function BandejaVacia({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex min-h-80 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <IconoCampana className="size-7" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-zinc-700 dark:text-zinc-200">{mensaje}</p>
        <p className="text-sm text-zinc-500">Aquí verás los avisos de tus membresías, clases, sesiones y pagos.</p>
      </div>
    </div>
  );
}
