'use client';

import { useRef, useState, useTransition } from 'react';
import { obtenerMiDesempeno } from '@/app/actions/desempeno';
import { textoRango, type RangoReporte, type Resultado } from '@/lib/reportes';
import {
  textoCalificacion,
  textoOcupacion,
  type ReporteDesempeno,
} from '@/lib/reportes-desempeno';
import { CargandoReporte, ErrorReporte, VacioReporte } from './estados-reporte';
import { SelectorRango } from './selector-rango';
import { tarjetaCss } from './tarjetas';

function Tarjeta({ titulo, valor, detalle, apagada = false }: { titulo: string; valor: string; detalle: string; apagada?: boolean }) {
  return (
    <div className={`${tarjetaCss} flex flex-col gap-1 p-5`}>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{titulo}</p>
      <p
        className={
          apagada
            ? 'text-lg font-medium text-zinc-500 dark:text-zinc-400'
            : 'text-3xl font-semibold tabular-nums text-zinc-900 dark:text-white'
        }
      >
        {valor}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{detalle}</p>
    </div>
  );
}

/**
 * FE-29.2 · "Mi desempeño" del entrenador: cuatro tarjetas con sus propias
 * métricas y el selector de fechas. Nunca envía entrenadorId: el backend usa
 * siempre el usuario de la sesión.
 */
export function MiDesempeno({ inicial, rangoInicial }: { inicial: Resultado<ReporteDesempeno>; rangoInicial: RangoReporte }) {
  const [rango, setRango] = useState(rangoInicial);
  const [resultado, setResultado] = useState<Resultado<ReporteDesempeno>>(inicial);
  const [cargando, iniciar] = useTransition();
  const ultima = useRef(0);

  function cargar(nuevo: RangoReporte) {
    setRango(nuevo);
    const consulta = ++ultima.current;
    iniciar(async () => {
      const r = await obtenerMiDesempeno(nuevo);
      if (consulta === ultima.current) setResultado(r);
    });
  }

  const fila = resultado.ok ? resultado.datos.filas[0] : undefined;

  return (
    <section aria-labelledby="titulo-mi-desempeno" className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 id="titulo-mi-desempeno" className="text-2xl font-semibold tracking-tight">
          Mi desempeño
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {textoRango(rango)} · Tus clases impartidas, sesiones con asistencia y reseñas del período
        </p>
      </div>

      <div className={`${tarjetaCss} p-5 sm:p-6`}>
        <SelectorRango rango={rango} onAplicar={cargar} deshabilitado={cargando} />
      </div>

      {cargando ? (
        <CargandoReporte />
      ) : !resultado.ok ? (
        <ErrorReporte mensaje={resultado.error} onReintentar={() => cargar(rango)} />
      ) : !fila ? (
        <VacioReporte mensaje="No encontramos tus métricas" detalle="Vuelve a iniciar sesión o consulta al administrador." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tarjeta titulo="Clases impartidas" valor={String(fila.clasesImpartidas)} detalle="Clases grupales que ya terminaron" />
          <Tarjeta
            titulo="Ocupación promedio"
            valor={textoOcupacion(fila.ocupacionPromedio)}
            detalle={fila.ocupacionPromedio === null ? 'Sin clases impartidas' : 'Reservas confirmadas ÷ cupo'}
            apagada={fila.ocupacionPromedio === null}
          />
          <Tarjeta titulo="Sesiones realizadas" valor={String(fila.sesionesRealizadas)} detalle='Sesiones con asistencia "Asistió"' />
          <Tarjeta
            titulo="Calificación"
            valor={textoCalificacion(fila.calificacion)}
            detalle={
              fila.calificacion === null
                ? `${fila.resenas} de 3 reseñas necesarias`
                : `${fila.resenas} ${fila.resenas === 1 ? 'reseña' : 'reseñas'} · de 5`
            }
            apagada={fila.calificacion === null}
          />
        </div>
      )}
    </section>
  );
}
