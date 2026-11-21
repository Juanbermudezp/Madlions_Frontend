'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerReporteRenovacion } from '@/app/actions/reportes';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { botonSecundarioCss } from '@/components/clases/estilos';
import { MENSAJES_REPORTES, textoRango, type RangoReporte, type Resultado } from '@/lib/reportes';
import { datosRenovacionPdf, porcentajeRenovacion, type ReporteRenovacion as Reporte } from '@/lib/reportes-renovacion';
import { BotonExportarPdf } from './boton-exportar-pdf';
import { CargandoReporte, ErrorReporte } from './estados-reporte';
import { SelectorRango } from './selector-rango';
import { tarjetaCss } from './tarjetas';
import { DonaRenovacion } from './dona-renovacion';
import { TablaNoRenovaron } from './tabla-no-renovaron';

export function ReporteRenovacion({ inicial, rangoInicial }: { inicial: Resultado<Reporte>; rangoInicial: RangoReporte }) {
  const [rango, setRango] = useState(rangoInicial);
  const [resultado, setResultado] = useState<Resultado<Reporte> | null>(inicial);
  const ultima = useRef(0);
  const router = useRouter();
  useEffect(() => () => { ultima.current++; }, []);
  useEffect(() => { if (resultado && !resultado.ok && resultado.estado === 401) router.replace('/login'); }, [resultado, router]);

  async function cargar(nuevo: RangoReporte) {
    const turno = ++ultima.current;
    setRango(nuevo); setResultado(null);
    let res: Resultado<Reporte>;
    try { res = await obtenerReporteRenovacion(nuevo); }
    catch { res = { ok: false, error: MENSAJES_REPORTES.sinConexion }; }
    if (turno === ultima.current) setResultado(res);
  }
  const datos = resultado?.ok ? resultado.datos : null;
  return <section aria-labelledby="titulo-renovacion" className="flex min-w-0 flex-1 flex-col gap-6">
    <div className={`${tarjetaCss} min-w-0 space-y-5 p-4 sm:p-6`}>
      <header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 id="titulo-renovacion" className="text-lg font-semibold">Reporte de renovación y cancelación</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{textoRango(rango)}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!resultado} className={botonSecundarioCss} onClick={() => cargar(rango)}>Actualizar</button>
          <BotonExportarPdf deshabilitado={!datos} obtenerDatos={() => {
            if (!datos) throw new Error('El reporte no está disponible para exportar.');
            return datosRenovacionPdf(datos, rango);
          }} />
        </div>
      </header>
      <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800"><SelectorRango key={`${rango.desde}:${rango.hasta}`} rango={rango} onAplicar={cargar} /></div>
    </div>
    <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">Membresías Mensual y Set de clases mensual con vencimiento entre {textoRango(rango)}. Los Daypass no se incluyen porque no se renuevan.</p>
    {!resultado ? <CargandoReporte /> : !resultado.ok ? resultado.estado === 403 ? <AccesoDenegado /> : <ErrorReporte mensaje={resultado.error} onReintentar={() => cargar(rango)} /> : <>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <section aria-label="Tasa de renovación" className={`${tarjetaCss} min-w-0 space-y-3 p-6`}><h3 className="font-semibold">Tasa de renovación</h3>
          <p className="break-words text-3xl font-semibold text-emerald-700 dark:text-emerald-300">{porcentajeRenovacion(resultado.datos.tasaRenovacion)}</p><p className="text-sm text-zinc-600 dark:text-zinc-400">{resultado.datos.renovadas} membresías renovadas</p></section>
        <section aria-label="Tasa de cancelación" className={`${tarjetaCss} min-w-0 space-y-3 p-6`}><h3 className="font-semibold">Tasa de cancelación</h3>
          <p className="break-words text-3xl font-semibold text-rose-700 dark:text-rose-300">{porcentajeRenovacion(resultado.datos.tasaCancelacion)}</p><p className="text-sm text-zinc-600 dark:text-zinc-400">{resultado.datos.canceladas} membresías canceladas</p></section>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2"><DonaRenovacion datos={resultado.datos} />
        <section aria-label="En período de renovación" className={`${tarjetaCss} min-w-0 space-y-4 p-6`}><h3 className="font-semibold">En período de renovación</h3><p className="text-4xl font-semibold tabular-nums">{resultado.datos.enPeriodo}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Membresías cuya ventana de siete días desde el vencimiento aún no ha terminado. No participan en el cálculo de las tasas.</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">La cancelación de este reporte es una clasificación analítica y no cambia el estado de la membresía.</p></section>
      </div>
      <TablaNoRenovaron key={`${rango.desde}:${rango.hasta}`} filas={resultado.datos.noRenovaron} />
    </>}
  </section>;
}
