import { botonPrimarioCss } from '@/components/clases/estilos';

/**
 * Estados compartidos de los reportes (FE-26.1). Los reutilizan FE-27.1,
 * FE-28.1, FE-29.1 y FE-21.1.
 */

export function CargandoReporte() {
  return (
    <div className="flex flex-col gap-4" aria-live="polite" aria-busy>
      <p className="text-sm text-zinc-500">Cargando el reporte…</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

export function ErrorReporte({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-10 text-center dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm text-red-700 dark:text-red-300">No se pudo cargar el reporte. {mensaje}</p>
      <button type="button" onClick={onReintentar} className={botonPrimarioCss}>
        Reintentar
      </button>
    </div>
  );
}

export function VacioReporte({ mensaje, detalle }: { mensaje: string; detalle?: string }) {
  return (
    <div className="flex min-h-72 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-7">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-base font-medium text-zinc-700 dark:text-zinc-200">{mensaje}</p>
      {detalle && <p className="text-sm text-zinc-500">{detalle}</p>}
    </div>
  );
}
