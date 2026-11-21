'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/** Error al cargar una pantalla, con botón Reintentar (convención del documento). */
export function ErrorCarga({ mensaje }: { mensaje: string }) {
  const router = useRouter();
  const [reintentando, iniciar] = useTransition();

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm text-red-700 dark:text-red-300">{mensaje}</p>
      <button
        type="button"
        onClick={() => iniciar(() => router.refresh())}
        disabled={reintentando}
        className="mt-4 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {reintentando ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>
  );
}

/** Marcador mientras carga una pantalla (lo usan los loading.tsx). */
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <p className="text-sm text-zinc-500">{texto}</p>
      <div className="h-10 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-64 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}
