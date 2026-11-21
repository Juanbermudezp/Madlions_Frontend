import { porcentajeRenovacion, type ReporteRenovacion } from '@/lib/reportes-renovacion';
import { tarjetaCss } from './tarjetas';

export function DonaRenovacion({ datos }: { datos: ReporteRenovacion }) {
  const total = datos.renovadas + datos.canceladas;
  const sinDatos = total === 0 || datos.tasaRenovacion === null || datos.tasaCancelacion === null;
  return <section aria-label="Distribución de renovación y cancelación" className={`${tarjetaCss} min-w-0 space-y-5 p-5 sm:p-6`}>
    <h3 className="font-semibold">Renovadas y canceladas</h3>
    {sinDatos ? <p className="py-10 text-center text-zinc-600 dark:text-zinc-400">Sin datos suficientes</p>
      : <div className="relative mx-auto size-52 max-w-full">
        <svg role="img" aria-label={`Renovadas: ${datos.renovadas} (${porcentajeRenovacion(datos.tasaRenovacion)}). Canceladas: ${datos.canceladas} (${porcentajeRenovacion(datos.tasaCancelacion)}). Total: ${total}.`} viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="14" className="text-rose-500 dark:text-rose-400" />
          <circle cx="50" cy="50" r="40" pathLength="100" fill="none" stroke="currentColor" strokeWidth="14" strokeDasharray={`${datos.tasaRenovacion} 100`} className="text-emerald-600 dark:text-emerald-400" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true"><span className="text-3xl font-semibold tabular-nums">{total}</span><span className="text-xs text-zinc-600 dark:text-zinc-400">Clasificadas</span></div>
      </div>}
    <ul className="space-y-3 text-sm">
      <li className="flex flex-wrap items-center justify-between gap-2"><span><span aria-hidden className="mr-2 inline-block size-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />Renovadas</span><span>{datos.renovadas} · {porcentajeRenovacion(datos.tasaRenovacion)}</span></li>
      <li className="flex flex-wrap items-center justify-between gap-2"><span><span aria-hidden className="mr-2 inline-block size-3 rounded-full bg-rose-500 dark:bg-rose-400" />Canceladas</span><span>{datos.canceladas} · {porcentajeRenovacion(datos.tasaCancelacion)}</span></li>
    </ul>
    <p className="text-xs text-zinc-600 dark:text-zinc-400">El período de renovación no participa en esta distribución.</p>
  </section>;
}
