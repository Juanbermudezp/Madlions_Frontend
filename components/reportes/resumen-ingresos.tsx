import { monedaIngresos, textoComparacionIngresos, type ReporteIngresos } from '@/lib/reportes-ingresos';
import { tarjetaCss } from './tarjetas';

export function ResumenIngresos({ reporte }: { reporte: ReporteIngresos }) {
  const comparacion = textoComparacionIngresos(reporte.anterior);
  const color = comparacion.direccion === 'sube' ? 'text-emerald-700 dark:text-emerald-300'
    : comparacion.direccion === 'baja' ? 'text-red-700 dark:text-red-300' : 'text-zinc-700 dark:text-zinc-300';
  return <div aria-label="Resumen de ingresos" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {[['Ingresos totales', reporte.total, 'IVA incluido'], ['Subtotal', reporte.subtotal, 'Sin IVA'], ['IVA (13 %)', reporte.iva, 'Impuesto incluido en el total']].map(([nombre, valor, detalle]) =>
      <section key={String(nombre)} aria-label={String(nombre)} className={`${tarjetaCss} min-w-0 space-y-2 p-5`}>
        <h3 className="text-sm text-zinc-600 dark:text-zinc-400">{nombre}</h3>
        <p className="break-words text-2xl font-semibold tabular-nums">{monedaIngresos(valor as number)}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{detalle}</p>
      </section>)}
    <section aria-label="Comparación con período anterior" className={`${tarjetaCss} min-w-0 space-y-2 p-5`}>
      <h3 className="text-sm text-zinc-600 dark:text-zinc-400">Comparación con período anterior</h3>
      <p className={`break-words text-2xl font-semibold tabular-nums ${color}`}>
        <span aria-hidden>{comparacion.direccion === 'sube' ? '↑' : comparacion.direccion === 'baja' ? '↓' : '→'} </span>{comparacion.diferencia}
      </p>
      <p className={`text-sm ${color}`}><span>{comparacion.descripcion}</span> · <span>{comparacion.porcentaje}</span></p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Anterior: {monedaIngresos(reporte.anterior.total)}</p>
    </section>
  </div>;
}
