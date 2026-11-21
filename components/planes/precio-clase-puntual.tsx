'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { guardarPrecioClasePuntual } from '@/app/actions/planes';
import { formatearPrecio, validarPrecioClasePuntual } from '@/lib/planes';
import { botonPrimarioCss, botonSecundarioCss, errorCampoCss } from '@/components/clases/estilos';

/**
 * FE-1.3: tarjeta "Precio de la clase puntual" sobre la tabla de planes.
 * Muestra el valor vigente y, al pulsar Editar, un campo con prefijo $.
 */
export function PrecioClasePuntual({
  precio,
  onGuardado,
}: {
  precio: string;
  onGuardado: (mensaje: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(precio);
  const [error, setError] = useState('');
  const [guardando, iniciar] = useTransition();

  function abrir() {
    setValor(precio);
    setError('');
    setEditando(true);
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const invalido = validarPrecioClasePuntual(valor);
    setError(invalido ?? '');
    if (invalido) return;

    iniciar(async () => {
      const resultado = await guardarPrecioClasePuntual(valor);
      if (resultado.ok) {
        setEditando(false);
        onGuardado(resultado.mensaje);
      } else {
        setError(resultado.error);
      }
    });
  }

  return (
    <section
      aria-labelledby="precio-clase-puntual-titulo"
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="precio-clase-puntual-titulo" className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Precio de la clase puntual
          </h2>
          {!editando && <p className="mt-1 text-2xl font-semibold">{formatearPrecio(Number(precio))}</p>}
        </div>
        {!editando && (
          <button type="button" className={botonSecundarioCss} onClick={abrir}>
            Editar
          </button>
        )}
      </div>

      {editando && (
        <form onSubmit={enviar} noValidate className="mt-3">
          <label htmlFor="precio-clase-puntual" className="sr-only">
            Precio de la clase puntual en USD
          </label>
          <div className="flex flex-wrap items-start gap-2">
            <div className="relative w-full sm:w-48">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-500"
              >
                $
              </span>
              <input
                id="precio-clase-puntual"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'precio-clase-puntual-error' : undefined}
                autoFocus
                className="w-full rounded-md border border-zinc-300 bg-white py-2 pr-3 pl-7 text-sm text-zinc-900 outline-none focus:border-zinc-900 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
              />
            </div>
            <div className="flex flex-1 gap-2 sm:flex-none">
              <button
                type="button"
                className={`${botonSecundarioCss} flex-1 sm:flex-none`}
                onClick={() => setEditando(false)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button type="submit" className={`${botonPrimarioCss} flex-1 sm:flex-none`} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
          {error && (
            <p id="precio-clase-puntual-error" className={errorCampoCss}>
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
