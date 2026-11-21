'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cambiarEstadoMaquina } from '@/app/actions/maquinas';
import {
  ETIQUETA_ESTADO_MAQUINA,
  estadosDisponibles,
  hoyEnElSalvador,
  pideFechaEstimada,
  validarCambioEstado,
  type DatosCambioEstado,
  type ErroresCambio,
  type Maquina,
} from '@/lib/maquinas';
import { Modal } from '@/components/clases/modal';
import { Notificacion } from '@/components/clases/notificacion';
import {
  botonPrimarioCss,
  botonSecundarioCss,
  campoCss,
  errorCampoCss,
} from '@/components/clases/estilos';

const VACIO: DatosCambioEstado = { estado: '', motivo: '', fechaEstimadaRetorno: '' };

/**
 * FE-18.1: botón "Cambiar estado" y su formulario. Solo lo monta el detalle,
 * que es del administrador y del entrenador (supuesto S13).
 */
export function CambiarEstado({ maquina }: { maquina: Maquina }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<DatosCambioEstado>(VACIO);
  const [errores, setErrores] = useState<ErroresCambio>({});
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);
  const [guardando, iniciar] = useTransition();

  const opciones = estadosDisponibles(maquina.estado);
  const conFecha = pideFechaEstimada(datos.estado);

  function abrir() {
    setDatos(VACIO);
    setErrores({});
    setError('');
    setAbierto(true);
  }

  function escribir(campo: keyof DatosCambioEstado, valor: string) {
    setDatos((previos) => ({ ...previos, [campo]: valor }));
    setErrores((previos) => {
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });
    setError('');
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();

    const encontrados = validarCambioEstado(datos);
    if (Object.keys(encontrados).length) {
      setErrores(encontrados);
      return;
    }

    iniciar(async () => {
      const resultado = await cambiarEstadoMaquina(maquina.id, datos);

      if (resultado.ok) {
        setAbierto(false);
        setAviso({ texto: resultado.mensaje, id: Date.now() });
        router.refresh();
        return;
      }

      setError(resultado.error);
      if (resultado.campo) {
        setErrores({ [resultado.campo as keyof DatosCambioEstado]: resultado.error });
      }
    });
  }

  return (
    <>
      <button type="button" onClick={abrir} className={botonPrimarioCss}>
        Cambiar estado
      </button>

      <Modal
        titulo={`Cambiar el estado de ${maquina.nombre}`}
        abierto={abierto}
        bloqueado={guardando}
        onCerrar={() => setAbierto(false)}
      >
        <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="estado-nuevo" className="text-sm font-medium">
              Estado nuevo
            </label>
            <select
              id="estado-nuevo"
              value={datos.estado}
              onChange={(evento) => escribir('estado', evento.target.value)}
              aria-invalid={Boolean(errores.estado)}
              className={campoCss}
            >
              <option value="">Elige un estado</option>
              {opciones.map((estado) => (
                <option key={estado} value={estado}>
                  {ETIQUETA_ESTADO_MAQUINA[estado]}
                </option>
              ))}
            </select>
            {errores.estado && <p className={errorCampoCss}>{errores.estado}</p>}
          </div>

          <div>
            <label htmlFor="motivo" className="text-sm font-medium">
              Motivo
            </label>
            <textarea
              id="motivo"
              rows={3}
              value={datos.motivo}
              onChange={(evento) => escribir('motivo', evento.target.value)}
              aria-invalid={Boolean(errores.motivo)}
              className={campoCss}
            />
            <p className="mt-1 text-xs text-zinc-500">
              {datos.motivo.trim().length}/250
            </p>
            {errores.motivo && <p className={errorCampoCss}>{errores.motivo}</p>}
          </div>

          {/* Al volver a "Operativa" no se pide fecha: la máquina ya retornó. */}
          {conFecha && (
            <div>
              <label htmlFor="fecha-retorno" className="text-sm font-medium">
                Fecha estimada de retorno <span className="text-zinc-500">(opcional)</span>
              </label>
              <input
                id="fecha-retorno"
                type="date"
                min={hoyEnElSalvador()}
                value={datos.fechaEstimadaRetorno}
                onChange={(evento) => escribir('fechaEstimadaRetorno', evento.target.value)}
                aria-invalid={Boolean(errores.fechaEstimadaRetorno)}
                className={campoCss}
              />
              {errores.fechaEstimadaRetorno && (
                <p className={errorCampoCss}>{errores.fechaEstimadaRetorno}</p>
              )}
            </div>
          )}

          {error && !errores.estado && !errores.motivo && !errores.fechaEstimadaRetorno && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              disabled={guardando}
              className={botonSecundarioCss}
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={botonPrimarioCss}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {aviso && (
        <Notificacion key={aviso.id} mensaje={aviso.texto} onCerrar={() => setAviso(null)} />
      )}
    </>
  );
}
