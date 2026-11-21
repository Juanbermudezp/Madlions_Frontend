import {
  COLOR_ESTADO_MAQUINA,
  ESTADOS_MAQUINA,
  ETIQUETA_ESTADO_MAQUINA,
  ETIQUETA_TIPO_MAQUINA,
  ETIQUETA_ZONA_MAQUINA,
  SIN_MAQUINAS,
  etiquetaFechaRetorno,
  hayFiltros,
  type FiltrosMaquina,
  type Maquina,
  type ResumenMaquinas,
} from '@/lib/maquinas';
import Link from 'next/link';
import { FiltrosEquipo } from './filtros-equipo';

// FE-17.1: vista del inventario de máquinas.

export function InventarioEquipo({
  resumen,
  maquinas,
  filtros,
  rutaBase,
  conDetalle,
}: {
  resumen: ResumenMaquinas;
  maquinas: Maquina[];
  filtros: FiltrosMaquina;
  rutaBase: string;
  /** H18: solo el administrador y el entrenador abren el detalle. */
  conDetalle: boolean;
}) {
  const conFiltros = hayFiltros(filtros);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Estado del equipo</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Consulta cómo está cada máquina antes de ir a usarla.
        </p>
      </div>
      <section aria-label="Resumen por estado" className="grid grid-cols-3 gap-2 sm:gap-3">
        {ESTADOS_MAQUINA.map((estado) => (
          <div
            key={estado}
            className={`rounded-lg border p-3 sm:p-4 ${COLOR_ESTADO_MAQUINA[estado].contador}`}
          >
            <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{resumen[estado]}</p>
            <p className="mt-1 text-xs font-medium sm:text-sm">
              {ETIQUETA_ESTADO_MAQUINA[estado]}
            </p>
          </div>
        ))}
      </section>

      <FiltrosEquipo filtros={filtros} rutaBase={rutaBase} />

      {conFiltros && (
        <p className="-mt-3 text-xs text-zinc-500">
          El resumen cuenta las máquinas de los filtros de tipo y zona en los tres estados.
        </p>
      )}

      {maquinas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {SIN_MAQUINAS}
        </p>
      ) : (
        <div>
          <p aria-live="polite" className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            {maquinas.length === 1 ? '1 máquina' : `${maquinas.length} máquinas`}
            {conFiltros ? ' con esos filtros' : ' en el inventario'}
          </p>

          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {maquinas.map((maquina) => (
              <TarjetaMaquina
                key={maquina.id}
                maquina={maquina}
                href={conDetalle ? `${rutaBase}/${maquina.id}` : null}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// `href` nulo para el miembro y recepción: su tarjeta no es clicable (H18).
function TarjetaMaquina({ maquina, href }: { maquina: Maquina; href: string | null }) {
  const color = COLOR_ESTADO_MAQUINA[maquina.estado];
  const hayCambio = Boolean(maquina.ultimoMotivo ?? maquina.ultimoCambioPor);

  return (
    <li
      className={`relative flex flex-col rounded-lg border border-l-4 border-zinc-200 p-4 dark:border-zinc-800 ${color.borde} ${
        href ? 'transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium break-words">
            {/* El enlace del nombre se estira sobre toda la tarjeta. */}
            {href ? (
              <Link
                href={href}
                className="after:absolute after:inset-0 after:rounded-lg hover:underline"
              >
                {maquina.nombre}
              </Link>
            ) : (
              maquina.nombre
            )}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-zinc-500">{maquina.codigo}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${color.etiqueta}`}
        >
          {ETIQUETA_ESTADO_MAQUINA[maquina.estado]}
        </span>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt className="text-zinc-500">Tipo:</dt>
          <dd>{ETIQUETA_TIPO_MAQUINA[maquina.tipo]}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-zinc-500">Zona:</dt>
          <dd>{ETIQUETA_ZONA_MAQUINA[maquina.zona]}</dd>
        </div>
      </dl>
      {maquina.estado !== 'OPERATIVA' && (
        <p className="mt-2 text-sm">
          <span className="text-zinc-500">Retorno estimado: </span>
          {etiquetaFechaRetorno(maquina.fechaEstimadaRetorno)}
        </p>
      )}

      {hayCambio && (
        <div className="mt-3 border-t border-zinc-200 pt-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {maquina.ultimoMotivo && <p className="break-words">Motivo: {maquina.ultimoMotivo}</p>}
          {maquina.ultimoCambioPor && (
            <p className="mt-0.5">
              Último cambio: {maquina.ultimoCambioPor.nombre} {maquina.ultimoCambioPor.apellido}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
