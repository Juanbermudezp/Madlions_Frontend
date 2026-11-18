'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { botonSecundarioCss } from '@/components/clases/estilos';
import { ERROR_CONEXION_RUTINAS, type ResultadoRutinaPropia } from '@/lib/rutinas-propias';

type Estado<T> = { cargando: true } | { cargando: false; resultado: ResultadoRutinaPropia<T> };

/** No guarda datos en el Router Cache: cada montaje y regreso al navegador
 * consulta una Server Action autorizada. La API compartida usa no-store.
 */
export function useConsultaRutinasPropias<T>(consultar: () => Promise<ResultadoRutinaPropia<T>>) {
  const [estado, setEstado] = useState<Estado<T>>({ cargando: true });
  const [revision, setRevision] = useState(0);
  const consulta = useRef(0);

  const actualizar = useCallback(() => {
    consulta.current++; // Invalida inmediatamente cualquier respuesta en vuelo.
    setEstado({ cargando: true }); // Retira los datos previos antes de consultar.
    setRevision((r) => r + 1);
  }, []);

  useEffect(() => {
    let vigente = true;
    const turno = ++consulta.current;
    consultar().then((resultado) => {
      if (vigente && turno === consulta.current) setEstado({ cargando: false, resultado });
    }).catch(() => {
      if (vigente && turno === consulta.current) setEstado({ cargando: false,
        resultado: { ok: false, error: ERROR_CONEXION_RUTINAS } });
    });
    return () => { vigente = false; };
  }, [consultar, revision]);

  useEffect(() => {
    const enfocar = () => { if (document.visibilityState === 'visible') actualizar(); };
    const restaurar = (evento: PageTransitionEvent) => { if (evento.persisted) actualizar(); };
    window.addEventListener('focus', enfocar);
    window.addEventListener('pageshow', restaurar);
    return () => {
      window.removeEventListener('focus', enfocar);
      window.removeEventListener('pageshow', restaurar);
    };
  }, [actualizar]);

  return { estado, actualizar };
}

export function ErrorConsultaRutinas({ fallo, reintentar }: {
  fallo: Extract<ResultadoRutinaPropia<never>, { ok: false }>; reintentar: () => void;
}) {
  return <div role="alert" className="space-y-3 break-words rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
    <p>{fallo.error}</p>
    <div className="flex flex-wrap items-center gap-3">
      {fallo.status !== 400 && <button type="button" className={botonSecundarioCss} onClick={reintentar}>Reintentar</button>}
      {fallo.status === 401 && <Link href="/login" className="underline">Iniciar sesión</Link>}
    </div>
  </div>;
}
