'use client';

import { useEffect } from 'react';

const DURACION_MS = 4000;

/**
 * Notificación flotante de éxito, centrada en la parte superior, debajo del encabezado.
 * Se cierra sola a los 4 segundos o con el botón ✕.
 * Para mostrar el mismo texto dos veces seguidas, cambia la `key` del componente.
 */
export function Notificacion({ mensaje, onCerrar }: { mensaje: string; onCerrar: () => void }) {
  useEffect(() => {
    const temporizador = setTimeout(onCerrar, DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [onCerrar]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-950 px-5 py-3 text-sm font-medium text-emerald-50 shadow-lg"
      >
        <span>{mensaje}</span>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar notificación"
          className="ml-2 rounded px-1 text-emerald-200 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
