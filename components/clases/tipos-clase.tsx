'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { guardarTipoClase } from '@/app/actions/clases';
import { validarTipoClase, type ErroresFormulario, type TipoClase } from '@/lib/clases';
import { Modal } from './modal';
import { botonPrimarioCss, botonSecundarioCss, campoCss, errorCampoCss } from './estilos';

/** FE-4.1: catálogo de tipos de clase del administrador. */
export function TiposClase({ tipos }: { tipos: TipoClase[] }) {
  // undefined = modal cerrado; null = tipo nuevo; TipoClase = edición.
  const [editando, setEditando] = useState<TipoClase | null | undefined>(undefined);
  const [aviso, setAviso] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tipos de clase</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Catálogo que se usa al programar clases y al definir los planes.
          </p>
        </div>
        <button
          type="button"
          className={botonPrimarioCss}
          onClick={() => {
            setAviso('');
            setEditando(null);
          }}
        >
          Nuevo tipo de clase
        </button>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-green-700 dark:text-green-400">
        {aviso}
      </p>

      {tipos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Aún no hay tipos de clase
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tipos.map((tipo) => (
                <tr key={tipo.id}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{tipo.nombre}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{tipo.descripcion}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className={botonSecundarioCss}
                      onClick={() => {
                        setAviso('');
                        setEditando(tipo);
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando !== undefined && (
        <FormularioTipoClase
          // key: el formulario se reinicia al abrirlo para otro tipo.
          key={editando?.id ?? 'nuevo'}
          tipo={editando}
          onCerrar={() => setEditando(undefined)}
          onGuardado={(mensaje) => {
            setEditando(undefined);
            setAviso(mensaje);
          }}
        />
      )}
    </div>
  );
}

function FormularioTipoClase({
  tipo,
  onCerrar,
  onGuardado,
}: {
  tipo: TipoClase | null;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [nombre, setNombre] = useState(tipo?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? '');
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, iniciar] = useTransition();

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const datos = { nombre, descripcion };
    const encontrados = validarTipoClase(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    iniciar(async () => {
      const resultado = await guardarTipoClase(tipo?.id ?? null, datos);
      if (resultado.ok) onGuardado(resultado.mensaje);
      else setErrores({ [resultado.campo ?? 'general']: resultado.error });
    });
  }

  return (
    <Modal
      abierto
      titulo={tipo ? `Editar ${tipo.nombre}` : 'Nuevo tipo de clase'}
      bloqueado={guardando}
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="tipo-nombre" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="tipo-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={40}
            aria-invalid={Boolean(errores.nombre)}
            className={campoCss}
            placeholder="Yoga, Spinning, Crossfit…"
          />
          <p className="mt-1 text-right text-xs text-zinc-500">{nombre.trim().length}/40</p>
          {errores.nombre && <p className={errorCampoCss}>{errores.nombre}</p>}
        </div>

        <div>
          <label htmlFor="tipo-descripcion" className="text-sm font-medium">
            Descripción
          </label>
          <textarea
            id="tipo-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={300}
            rows={3}
            aria-invalid={Boolean(errores.descripcion)}
            className={campoCss}
          />
          <p className="mt-1 text-right text-xs text-zinc-500">{descripcion.trim().length}/300</p>
          {errores.descripcion && <p className={errorCampoCss}>{errores.descripcion}</p>}
        </div>

        {errores.general && (
          <p role="alert" className="text-sm text-red-600">
            {errores.general}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className={botonSecundarioCss} onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className={botonPrimarioCss} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
