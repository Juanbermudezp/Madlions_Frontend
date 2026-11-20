import { ETIQUETA_OCUPACION, textoPorcentaje, type FilaOcupacion, resumenOcupacion } from '@/lib/reportes';
import { tarjetaCss } from './tarjetas';

function Tarjeta({ titulo, children, pie }: { titulo: string; children: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <div className={`${tarjetaCss} flex flex-col gap-2 p-5`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{titulo}</dt>
      <dd className="flex flex-1 flex-col justify-between gap-3">
        {children}
        {pie && <div className="text-xs text-zinc-500 dark:text-zinc-400">{pie}</div>}
      </dd>
    </div>
  );
}

const numeroCss = 'text-3xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white';

/** FE-26.1 · Totales del período encima de la gráfica. */
export function ResumenOcupacion({ filas }: { filas: FilaOcupacion[] }) {
  const r = resumenOcupacion(filas);
  return (
    <dl aria-label="Resumen del período" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tarjeta titulo="Ocupación general" pie={`${r.reservasConfirmadas} de ${r.cupoTotal} lugares ocupados`}>
        <span className={numeroCss}>{textoPorcentaje(r.ocupacionGeneral)}</span>
        <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <span
            className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
            style={{ width: `${Math.min(r.ocupacionGeneral, 100)}%` }}
          />
        </span>
      </Tarjeta>
      <Tarjeta
        titulo="Clases impartidas"
        pie={`${filas.length} ${filas.length === 1 ? 'combinación' : 'combinaciones'} de clase y entrenador`}
      >
        <span className={numeroCss}>{r.clasesImpartidas}</span>
      </Tarjeta>
      <Tarjeta titulo="Reservas confirmadas" pie={`Sobre ${r.cupoTotal} lugares disponibles`}>
        <span className={numeroCss}>{r.reservasConfirmadas}</span>
      </Tarjeta>
      <Tarjeta titulo="Etiquetas">
        <div className="flex flex-col gap-2 text-sm">
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
              {ETIQUETA_OCUPACION.ALTA}
            </span>
            <span className="text-lg font-semibold tabular-nums">{r.alta}</span>
          </span>
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span aria-hidden className="size-2 rounded-full bg-amber-500" />
              {ETIQUETA_OCUPACION.BAJA}
            </span>
            <span className="text-lg font-semibold tabular-nums">{r.baja}</span>
          </span>
        </div>
      </Tarjeta>
    </dl>
  );
}
