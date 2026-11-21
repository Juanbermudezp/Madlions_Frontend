'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { obtenerDetalleIngresos } from '@/app/actions/reportes';
import { botonSecundarioCss, campoCss } from '@/components/clases/estilos';
import { fechaCorta, MENSAJES_REPORTES, textoRango, type RangoReporte, type Resultado } from '@/lib/reportes';
import { CONCEPTOS_INGRESOS, ETIQUETA_CONCEPTO_INGRESOS, monedaIngresos, PAGOS_INGRESOS_POR_PAGINA, type DetalleIngresos } from '@/lib/reportes-ingresos';
import type { ConceptoCobro } from '@/lib/pagos';
import { CargandoReporte, ErrorReporte, VacioReporte } from './estados-reporte';
import { SelectorRango } from './selector-rango';
import { contenerFocoIngresos } from './foco-modal-ingresos';

type Fallo = Extract<Resultado<never>, { ok: false }>;
type Props = { concepto: ConceptoCobro; rango: RangoReporte; onCerrar: () => void;
  onConcepto: (concepto: ConceptoCobro) => void; onRango: (rango: RangoReporte) => void; onDenegado: (fallo: Fallo) => void };

/** Dialog nativo: foco contenido e interfaz exterior inerte; Escape/cierre
 * restaura el foco del disparador. Se bloquea el scroll exterior, no el modal.
 */
export function ModalDetalleIngresos({ concepto, rango, onCerrar, onConcepto, onRango, onDenegado }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  const titulo = useId();
  useEffect(() => {
    const elemento = dialogo.current!;
    const origen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const desbordamiento = document.body.style.overflow;
    elemento.showModal();
    document.body.style.overflow = 'hidden';
    cerrar.current?.focus();
    return () => {
      elemento.close();
      document.body.style.overflow = desbordamiento;
      if (origen?.isConnected) origen.focus();
    };
  }, []);

  const identidad = `${concepto}:${rango.desde}:${rango.hasta}`;
  return <dialog ref={dialogo} aria-modal="true" aria-labelledby={titulo} onKeyDown={contenerFocoIngresos}
    onCancel={(e) => { e.preventDefault(); onCerrar(); }}
    onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
    <div className="min-w-0 space-y-5 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 id={titulo} className="break-words text-lg font-semibold">Pagos de {ETIQUETA_CONCEPTO_INGRESOS[concepto].toLowerCase()}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{textoRango(rango)}</p></div>
        <button type="button" ref={cerrar} className={botonSecundarioCss} onClick={onCerrar}>Cerrar</button>
      </header>
      <label className="block text-sm">Concepto
        <select className={`${campoCss} max-w-sm`} value={concepto} onChange={(e) => onConcepto(e.target.value as ConceptoCobro)}>
          {CONCEPTOS_INGRESOS.map((c) => <option key={c} value={c}>{ETIQUETA_CONCEPTO_INGRESOS[c]}</option>)}
        </select>
      </label>
      <details><summary className="cursor-pointer text-sm underline">Cambiar período</summary>
        <div className="mt-3"><SelectorRango key={`${rango.desde}:${rango.hasta}`} rango={rango} onAplicar={onRango} /></div>
      </details>
      <ConsultaDetalle key={identidad} concepto={concepto} rango={rango} onDenegado={onDenegado} />
    </div>
  </dialog>;
}

function ConsultaDetalle(props: Pick<Props, 'concepto' | 'rango' | 'onDenegado'>) {
  const [pagina, setPagina] = useState(1);
  const [revision, setRevision] = useState(0);
  // Cada página/consulta parte de carga y descarta su respuesta al desmontar.
  return <PaginaDetalle key={`${pagina}:${revision}`} {...props} pagina={pagina} onPagina={setPagina} onReintentar={() => setRevision((r) => r + 1)} />;
}

function PaginaDetalle({ concepto, rango: { desde, hasta }, pagina, onDenegado, onPagina, onReintentar }: Pick<Props, 'concepto' | 'rango' | 'onDenegado'> & {
  pagina: number; onPagina: (pagina: number) => void; onReintentar: () => void;
}) {
  const [resultado, setResultado] = useState<Resultado<DetalleIngresos> | null>(null);
  useEffect(() => {
    let vigente = true;
    obtenerDetalleIngresos(concepto, { desde, hasta }, pagina).then((res) => {
      if (!vigente) return;
      if (!res.ok && (res.estado === 401 || res.estado === 403)) { onDenegado(res); return; }
      setResultado(res);
    }).catch(() => { if (vigente) setResultado({ ok: false, error: MENSAJES_REPORTES.sinConexion }); });
    return () => { vigente = false; };
  }, [concepto, desde, hasta, pagina, onDenegado]);

  if (!resultado) return <CargandoReporte />;
  if (!resultado.ok) return <ErrorReporte mensaje={resultado.error} onReintentar={onReintentar} />;
  const { items, total } = resultado.datos;
  const ultimaPagina = Math.max(1, Math.ceil(total / PAGOS_INGRESOS_POR_PAGINA));
  return <div className="min-w-0 space-y-4">
    {items.length === 0 ? <VacioReporte mensaje="No hay pagos para este concepto en esta página" detalle="Revisa el período o vuelve a la página anterior." />
      : <div className="min-w-0 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700" tabIndex={0} role="region" aria-label="Tabla de pagos">
        <table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Pagos de {ETIQUETA_CONCEPTO_INGRESOS[concepto]}, {textoRango({ desde, hasta })}</caption>
          <thead className="bg-zinc-50 dark:bg-zinc-800"><tr>{['Miembro', 'Código', 'Fecha de pago', 'Monto', 'Número de transacción'].map((columna) => <th key={columna} scope="col" className="px-4 py-3">{columna}</th>)}</tr></thead>
          <tbody>{items.map((p) => <tr key={p.referencia} className="border-t border-zinc-200 dark:border-zinc-700">
            <td className="px-4 py-3">{p.miembro}</td><td className="whitespace-nowrap px-4 py-3">{p.codigo}</td>
            <td className="whitespace-nowrap px-4 py-3">{fechaCorta(p.fecha)}</td><td className="whitespace-nowrap px-4 py-3 tabular-nums">{monedaIngresos(p.monto)}</td>
            <td className="whitespace-nowrap px-4 py-3">{p.referencia}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    <nav aria-label="Páginas de pagos" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span aria-live="polite">Página {pagina} · {total} {total === 1 ? 'pago' : 'pagos'}</span>
      <div className="flex gap-2"><button type="button" className={botonSecundarioCss} disabled={pagina <= 1} onClick={() => onPagina(Math.max(1, pagina - 1))}>Anterior</button>
        <button type="button" className={botonSecundarioCss} disabled={pagina >= ultimaPagina} onClick={() => onPagina(Math.min(ultimaPagina, pagina + 1))}>Siguiente</button></div>
    </nav>
  </div>;
}
