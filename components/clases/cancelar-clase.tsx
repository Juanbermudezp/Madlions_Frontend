'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { cancelarClase } from '@/app/actions/clases';
import {
  MENSAJES_CANCELACION_CLASE,
  MOTIVO_MAXIMO,
  etiquetaDiaLarga,
  fechaLocal,
  horaLocal,
  validarMotivoCancelacion,
  type ClaseAgenda,
} from '@/lib/clases';
import { Modal } from './modal';
import { botonSecundarioCss, campoCss, errorCampoCss } from './estilos';

/**
 * FE-7.1 · Confirmación para cancelar una clase con un motivo obligatorio de
 * 10 a 250 caracteres. Muestra cuántas reservas se cancelarán y el error del
 * motivo junto al campo; los rechazos del backend aparecen dentro del modal.
 */
export function CancelarClase({
  clase,
  onCerrar,
  onCancelada,
}: {
  clase: ClaseAgenda;
  onCerrar: () => void;
  onCancelada: (claseId: string, reservasCanceladas: number) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, iniciar] = useTransition();
  const idMotivo = useId();

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError('');
    const invalido = validarMotivoCancelacion(motivo);
    setErrorMotivo(invalido ?? '');
    if (invalido) return;

    iniciar(async () => {
      const resultado = await cancelarClase(clase.id, motivo);
      if (resultado.ok) {
        onCancelada(clase.id, resultado.reservasCanceladas);
        return;
      }
      if (resultado.campo === 'motivo') setErrorMotivo(resultado.error);
      else setError(resultado.error);
    });
  }

  return (
    <Modal titulo="Cancelar clase" abierto bloqueado={enviando} onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800/60">
          <p className="font-semibold">{clase.tipo.nombre}</p>
          <p className="first-letter:uppercase text-zinc-600 dark:text-zinc-400">
            {etiquetaDiaLarga(fechaLocal(clase.inicio))} · {horaLocal(clase.inicio)} – {horaLocal(clase.fin)} ·{' '}
            {clase.entrenador.nombre}
          </p>
        </div>

        <p className="text-sm">{MENSAJES_CANCELACION_CLASE.reservasAfectadas(clase.reservasConfirmadas)}</p>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={idMotivo} className="text-sm font-medium">
              Motivo de la cancelación
            </label>
            <span className="text-xs tabular-nums text-zinc-500" aria-live="polite">
              {motivo.length}/{MOTIVO_MAXIMO}
            </span>
          </div>
          <textarea
            id={idMotivo}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={MOTIVO_MAXIMO}
            rows={4}
            aria-invalid={Boolean(errorMotivo)}
            aria-describedby={errorMotivo ? `${idMotivo}-error` : undefined}
            placeholder="Por ejemplo: el entrenador no puede asistir por una emergencia."
            className={`${campoCss} resize-y`}
          />
          {errorMotivo && (
            <p id={`${idMotivo}-error`} className={errorCampoCss}>
              {errorMotivo}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} disabled={enviando} className={botonSecundarioCss}>
            Volver
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-60"
          >
            {enviando ? 'Cancelando…' : 'Cancelar clase'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
