'use client';

import { useEffect } from 'react';

const DURACION_MS = 4000;

/**
 * Notificación flotante de éxito, arriba y al centro de la pantalla.
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
        className="pointer-events-auto flex items-center gap-3 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-black/10"
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-base"
        >
          ✓
        </span>
        <span>{mensaje}</span>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar notificación"
          className="ml-2 rounded px-1 text-white/80 hover:bg-white/15 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
