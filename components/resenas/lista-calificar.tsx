'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { guardarResena } from '@/app/actions/resenas';
import {
  ASPECTOS,
  cuerpoResena,
  diasRestantes,
  ETIQUETA_ASPECTO,
  etiquetaActividad,
  etiquetaFechaLimite,
  hayAlgunaCalificacion,
  MAXIMO_COMENTARIO,
  SIN_PENDIENTES,
  type Aspecto,
  type Calificaciones,
  type PendientePorCalificar,
} from '@/lib/resenas';
import { Notificacion } from '@/components/clases/notificacion';
import { botonPrimarioCss, campoCss } from '@/components/clases/estilos';
import { Estrellas } from './estrellas';

/**
 * FE-20.1: una tarjeta por clase o sesión pendiente, con las tres filas de
 * estrellas y el comentario. Al guardar, la tarjeta sale de la lista.
 */
export function ListaCalificar({ pendientes }: { pendientes: PendientePorCalificar[] }) {
  const router = useRouter();
  const [enviadas, setEnviadas] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);

  const visibles = pendientes.filter((p) => !enviadas.includes(p.registroId));

  if (visibles.length === 0) {
    return (
      <>
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {SIN_PENDIENTES}
        </p>
        {aviso && (
          <Notificacion key={aviso.id} mensaje={aviso.texto} onCerrar={() => setAviso(null)} />
        )}
      </>
    );
  }

  function alGuardar(registroId: string, mensaje: string) {
    setEnviadas((previas) => [...previas, registroId]);
    setAviso({ texto: mensaje, id: Date.now() });
    router.refresh();
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {visibles.map((pendiente) => (
          <TarjetaCalificar
            key={pendiente.registroId}
            pendiente={pendiente}
            alGuardar={alGuardar}
          />
        ))}
      </ul>

      {aviso && (
        <Notificacion key={aviso.id} mensaje={aviso.texto} onCerrar={() => setAviso(null)} />
      )}
    </>
  );
}

function TarjetaCalificar({
  pendiente,
  alGuardar,
}: {
  pendiente: PendientePorCalificar;
  alGuardar: (registroId: string, mensaje: string) => void;
}) {
  const [calificaciones, setCalificaciones] = useState<Calificaciones>({});
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [guardando, iniciar] = useTransition();

  const puedeEnviar = hayAlgunaCalificacion(calificaciones);
  const dias = diasRestantes(pendiente.fechaLimite);

  function elegir(aspecto: Aspecto, valor: number | undefined) {
    setError('');
    setCalificaciones((previas) => {
      const siguientes = { ...previas };
      if (valor === undefined) delete siguientes[aspecto];
      else siguientes[aspecto] = valor;
      return siguientes;
    });
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!puedeEnviar) return;

    setError('');
    iniciar(async () => {
      const resultado = await guardarResena(
        cuerpoResena(pendiente, calificaciones, comentario),
      );

      if (resultado.ok) {
        alGuardar(pendiente.registroId, resultado.mensaje);
        return;
      }
      setError(resultado.error);
    });
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium break-words">{pendiente.nombre}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Con {pendiente.entrenador}
          </p>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {etiquetaActividad(pendiente.fin)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            dias <= 1
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          Califica antes del {etiquetaFechaLimite(pendiente.fechaLimite)}
        </span>
      </div>

      <form onSubmit={enviar} noValidate className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {ASPECTOS.map((aspecto) => (
            <Estrellas
              key={aspecto}
              etiqueta={ETIQUETA_ASPECTO[aspecto]}
              valor={calificaciones[aspecto]}
              bloqueado={guardando}
              alElegir={(valor) => elegir(aspecto, valor)}
            />
          ))}
        </div>

        <div>
          <label htmlFor={`comentario-${pendiente.registroId}`} className="text-sm font-medium">
            Comentario <span className="text-zinc-500">(opcional)</span>
          </label>
          <textarea
            id={`comentario-${pendiente.registroId}`}
            rows={2}
            maxLength={MAXIMO_COMENTARIO}
            value={comentario}
            onChange={(evento) => setComentario(evento.target.value)}
            disabled={guardando}
            className={campoCss}
          />
          <p className="mt-1 text-xs text-zinc-500">
            {comentario.trim().length}/{MAXIMO_COMENTARIO}
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!puedeEnviar || guardando}
            className={botonPrimarioCss}
          >
            {guardando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </li>
  );
}
