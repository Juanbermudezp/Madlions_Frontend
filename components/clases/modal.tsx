'use client';

import { useEffect, useId } from 'react';

/** Ventana modal sencilla. Se cierra con Escape o con el fondo, salvo mientras se guarda. */
export function Modal({
  titulo,
  abierto,
  bloqueado = false,
  onCerrar,
  children,
}: {
  titulo: string;
  abierto: boolean;
  bloqueado?: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const idTitulo = useId();

  useEffect(() => {
    if (!abierto) return;
    function alPresionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !bloqueado) onCerrar();
    }
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierto, bloqueado, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={() => !bloqueado && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-xl dark:bg-zinc-900"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={idTitulo} className="text-lg font-semibold">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={bloqueado}
            aria-label="Cerrar"
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
