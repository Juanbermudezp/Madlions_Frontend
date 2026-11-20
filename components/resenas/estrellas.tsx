'use client';

const VALORES = [1, 2, 3, 4, 5] as const;

/**
 * Cinco estrellas para un aspecto. Son botones, así que funcionan con el
 * teclado; la elegida y las anteriores quedan llenas. Se puede quitar la
 * calificación volviendo a tocar la misma estrella, porque el aspecto es
 * opcional (H20, criterio 2).
 */
export function Estrellas({
  etiqueta,
  valor,
  bloqueado,
  alElegir,
}: {
  etiqueta: string;
  valor: number | undefined;
  bloqueado: boolean;
  alElegir: (valor: number | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span id={`aspecto-${etiqueta}`} className="text-sm">
        {etiqueta}
      </span>

      <div role="group" aria-labelledby={`aspecto-${etiqueta}`} className="flex gap-1">
        {VALORES.map((estrella) => {
          const llena = valor !== undefined && estrella <= valor;

          return (
            <button
              key={estrella}
              type="button"
              disabled={bloqueado}
              aria-pressed={llena}
              aria-label={`${estrella} ${estrella === 1 ? 'estrella' : 'estrellas'} en ${etiqueta}`}
              onClick={() => alElegir(valor === estrella ? undefined : estrella)}
              className={`rounded px-1 text-2xl leading-none transition-colors disabled:opacity-60 ${
                llena ? 'text-amber-400' : 'text-zinc-300 hover:text-amber-200 dark:text-zinc-700'
              }`}
            >
              {llena ? '★' : '☆'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
