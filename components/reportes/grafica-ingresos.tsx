import { fechaCorta } from '@/lib/reportes';
import { monedaIngresos, ordenarIngresosDiarios, type IngresoDiario } from '@/lib/reportes-ingresos';
import { tarjetaCss } from './tarjetas';

/** Una línea sin biblioteca adicional. Los ejes HTML conservan tamaño legible
 * en móvil; la tabla textual permite recorrer todos los días, incluidos ceros.
 */
export function GraficaIngresos({ dias }: { dias: IngresoDiario[] }) {
  const ordenados = ordenarIngresosDiarios(dias);
  const maximo = Math.max(1, ...ordenados.map((d) => d.total));
  const puntos = ordenados.map((d, i) => ({ ...d,
    x: ordenados.length === 1 ? 300 : 8 + i * 584 / (ordenados.length - 1), y: 200 - d.total / maximo * 188,
  }));
  return <figure className={`${tarjetaCss} min-w-0 p-4 sm:p-6`}>
    <figcaption className="mb-5 space-y-1"><h3 className="font-semibold">Ingresos por día</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Ingresos en USD · Fecha de pago en El Salvador</p></figcaption>
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
      <div aria-hidden className="flex h-52 flex-col justify-between py-2 text-right text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
        {[maximo, maximo / 2, 0].map((v, i) => <span key={i}>{monedaIngresos(v)}</span>)}
      </div>
      <div className="min-w-0">
        <svg role="img" aria-label={`Gráfica de ingresos por día: ${ordenados.length} días; valores completos en la tabla de ingresos diarios.`}
          viewBox="0 0 600 220" preserveAspectRatio="none" className="h-52 w-full text-[#2a78d6] dark:text-[#3987e5]">
          {[12, 106, 200].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.15" />)}
          {puntos.length > 1 && <polyline points={puntos.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
          {puntos.map((p) => <circle key={p.fecha} cx={p.x} cy={p.y} r={puntos.length > 60 ? 2 : 4} fill="currentColor">
            <title>{fechaCorta(p.fecha)}: {monedaIngresos(p.total)}</title>
          </circle>)}
        </svg>
        {ordenados.length > 0 && <div aria-hidden className="flex min-w-0 justify-between gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>{fechaCorta(ordenados[0].fecha)}</span>{ordenados.length > 1 && <span>{fechaCorta(ordenados.at(-1)!.fecha)}</span>}
        </div>}
      </div>
    </div>
    <details className="mt-5 text-sm"><summary className="cursor-pointer text-zinc-700 dark:text-zinc-300">Ver ingresos diarios en tabla</summary>
      <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800" tabIndex={0} role="region" aria-label="Ingresos diarios">
        <table className="w-full text-left text-sm"><caption className="sr-only">Ingresos diarios en dólares</caption>
          <thead><tr><th scope="col" className="p-3">Fecha</th><th scope="col" className="p-3 text-right">Ingresos</th></tr></thead>
          <tbody>{ordenados.map((d) => <tr key={d.fecha} className="border-t border-zinc-200 dark:border-zinc-800">
            <td className="p-3">{fechaCorta(d.fecha)}</td><td className="p-3 text-right tabular-nums">{monedaIngresos(d.total)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </figure>;
}
