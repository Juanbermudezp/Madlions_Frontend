'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { obtenerReporteIngresos } from '@/app/actions/reportes';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { botonSecundarioCss } from '@/components/clases/estilos';
import type { ConceptoCobro } from '@/lib/pagos';
import { MENSAJES_REPORTES, textoRango, type RangoReporte, type Resultado } from '@/lib/reportes';
import { datosIngresosPdf, ETIQUETA_CONCEPTO_INGRESOS, ETIQUETA_PLAN_INGRESOS, monedaIngresos, type ReporteIngresos as Reporte } from '@/lib/reportes-ingresos';
import { BotonExportarPdf } from './boton-exportar-pdf';
import { CargandoReporte, ErrorReporte, VacioReporte } from './estados-reporte';
import { GraficaIngresos } from './grafica-ingresos';
import { ModalDetalleIngresos } from './modal-detalle-ingresos';
import { ResumenIngresos } from './resumen-ingresos';
import { SelectorRango } from './selector-rango';
import { tarjetaCss } from './tarjetas';

export function ReporteIngresos({ inicial, rangoInicial }: { inicial: Resultado<Reporte>; rangoInicial: RangoReporte }) {
  const [rango, setRango] = useState(rangoInicial);
  const [resultado, setResultado] = useState<Resultado<Reporte> | null>(inicial);
  const [concepto, setConcepto] = useState<ConceptoCobro | null>(null);
  const ultima = useRef(0);
  useEffect(() => () => { ultima.current++; }, []);

  async function cargar(nuevo: RangoReporte) {
    const turno = ++ultima.current;
    setRango(nuevo);
    setResultado(null); // Purga datos/PDF anteriores desde el inicio de consulta.
    let res: Resultado<Reporte>;
    try { res = await obtenerReporteIngresos(nuevo); }
    catch { res = { ok: false, error: MENSAJES_REPORTES.sinConexion }; }
    if (turno !== ultima.current) return;
    setResultado(res);
    if (!res.ok && (res.estado === 401 || res.estado === 403)) setConcepto(null);
  }
  const cerrar = useCallback(() => setConcepto(null), []);
  const denegado = useCallback((res: Extract<Resultado<never>, { ok: false }>) => {
    ultima.current++; setResultado(res); setConcepto(null);
  }, []);
  const datos = resultado?.ok ? resultado.datos : null;

  return <section aria-labelledby="titulo-ingresos" className="flex min-w-0 flex-1 flex-col gap-6">
    <div className={`${tarjetaCss} min-w-0 space-y-5 p-4 sm:p-6`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><h2 id="titulo-ingresos" className="text-lg font-semibold">Reporte de ingresos</h2>
          <p className="mt-1 break-words text-sm text-zinc-500 dark:text-zinc-400">{textoRango(rango)} · Pagos aprobados, IVA incluido</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonSecundarioCss} disabled={!resultado} onClick={() => cargar(rango)}>Actualizar</button>
          <BotonExportarPdf deshabilitado={!datos} obtenerDatos={() => {
            if (!datos) throw new Error('El reporte no está disponible para exportar.');
            return datosIngresosPdf(datos, rango);
          }} />
        </div>
      </header>
      <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800"><SelectorRango key={`${rango.desde}:${rango.hasta}`} rango={rango} onAplicar={cargar} /></div>
    </div>
    {!resultado ? <CargandoReporte />
      : !resultado.ok ? resultado.estado === 403 ? <AccesoDenegado />
        : <><ErrorReporte mensaje={resultado.error} onReintentar={() => cargar(rango)} />
          {resultado.estado === 401 && <Link href="/login" className="text-sm underline">Iniciar sesión</Link>}</>
      : <>
        <ResumenIngresos reporte={resultado.datos} />
        {resultado.datos.total === 0 && <VacioReporte mensaje="No hay ingresos en este período" detalle="Los totales son $0.00. Puedes consultar otro período." />}
        <GraficaIngresos dias={resultado.datos.porDia} />
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <section className={`${tarjetaCss} min-w-0 p-4 sm:p-6`} aria-labelledby="conceptos-ingresos">
            <h3 id="conceptos-ingresos" className="mb-4 font-semibold">Ingresos por concepto</h3>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {resultado.datos.porConcepto.map((c) => <li key={c.concepto} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0"><p className="break-words text-sm">{ETIQUETA_CONCEPTO_INGRESOS[c.concepto]}</p>
                  <p className="mt-1 break-words font-semibold tabular-nums">{monedaIngresos(c.total)}</p></div>
                <button type="button" className={botonSecundarioCss} onClick={() => setConcepto(c.concepto)} aria-label={`Ver detalle de ${ETIQUETA_CONCEPTO_INGRESOS[c.concepto].toLowerCase()}`}>Ver detalle</button>
              </li>)}
            </ul>
          </section>
          <section className={`${tarjetaCss} min-w-0 p-4 sm:p-6`} aria-labelledby="planes-ingresos">
            <h3 id="planes-ingresos" className="font-semibold">Ingresos por tipo de plan</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Solo membresías y renovaciones. No incluye las sesiones adicionales.</p>
            <dl className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
              {resultado.datos.porTipoPlan.map((p) => <div key={p.tipoPlan} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm">
                <dt>{ETIQUETA_PLAN_INGRESOS[p.tipoPlan]}</dt><dd className="font-semibold tabular-nums">{monedaIngresos(p.total)}</dd>
              </div>)}
            </dl>
          </section>
        </div>
      </>}
    {concepto && <ModalDetalleIngresos concepto={concepto} rango={rango} onCerrar={cerrar} onConcepto={setConcepto} onRango={cargar} onDenegado={denegado} />}
  </section>;
}
