'use client';

import Link from 'next/link';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { pagarCobro } from '@/app/actions/pagos';
import { hoyLocal } from '@/lib/clases';
import {
  ETIQUETA_CONCEPTO,
  MENSAJES_PAGOS,
  formatearNumeroTarjeta,
  formatearVencimiento,
  rutaComprobante,
  validarTarjeta,
  type Cobro,
  type DatosTarjeta,
} from '@/lib/pagos';
import { formatearPrecio } from '@/lib/planes';
import { Modal } from '@/components/clases/modal';
import { botonPrimarioCss, botonSecundarioCss, campoCss, errorCampoCss } from '@/components/clases/estilos';

type Paso =
  | { tipo: 'formulario' }
  | { tipo: 'aprobado'; comprobanteNumero: string; referencia: string }
  | { tipo: 'fallido'; mensaje: string };

const VACIA: DatosTarjeta = { titular: '', numero: '', vencimiento: '', cvv: '' };

/**
 * FE-12.2: checkout de la pasarela simulada.
 *
 * Los datos de la tarjeta viven solo en el estado de este componente: no se
 * guardan en Zustand, localStorage ni otro almacenamiento persistente. Quien
 * lo usa lo desmonta al cerrarlo, así los campos sensibles desaparecen.
 */
export function PagarCobro({
  cobro,
  onCerrar,
  onAprobado,
}: {
  cobro: Cobro;
  onCerrar: () => void;
  /** Se llama una vez cuando el pago se aprueba, para actualizar la lista. */
  onAprobado: () => void;
}) {
  const [tarjeta, setTarjeta] = useState<DatosTarjeta>(VACIA);
  const [errores, setErrores] = useState<Partial<Record<keyof DatosTarjeta | 'general', string>>>({});
  const [paso, setPaso] = useState<Paso>({ tipo: 'formulario' });
  const [procesando, iniciar] = useTransition();
  // Candado síncrono: un doble clic puede llegar antes de que React deshabilite el botón.
  const enviando = useRef(false);

  function cambiar(campo: keyof DatosTarjeta, valor: string) {
    setTarjeta((actual) => ({ ...actual, [campo]: valor }));
  }

  function cerrar() {
    if (enviando.current) return;
    setTarjeta(VACIA);
    onCerrar();
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando.current) return;
    const encontrados = validarTarjeta(tarjeta, hoyLocal());
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    enviando.current = true;
    iniciar(async () => {
      try {
        const respuesta = await pagarCobro(cobro.id, tarjeta);
        if (!respuesta.ok) {
          setErrores({ general: respuesta.error });
        } else if (respuesta.resultado === 'APROBADO') {
          setTarjeta(VACIA);
          setPaso({ tipo: 'aprobado', comprobanteNumero: respuesta.comprobanteNumero, referencia: respuesta.referencia });
          onAprobado();
        } else {
          setPaso({ tipo: 'fallido', mensaje: respuesta.mensaje });
        }
      } finally {
        enviando.current = false;
      }
    });
  }

  return (
    <Modal abierto titulo="Pagar" bloqueado={procesando} onCerrar={cerrar}>
      <div className="mb-4 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {ETIQUETA_CONCEPTO[cobro.concepto]} · {cobro.detalle}
        </p>
        <p className="mt-1 text-sm">
          Monto a pagar: <span className="text-lg font-semibold">{formatearPrecio(cobro.monto)}</span>{' '}
          <span className="text-xs text-zinc-500">IVA incluido</span>
        </p>
      </div>

      {paso.tipo === 'aprobado' && (
        <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{MENSAJES_PAGOS.aprobado}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Comprobante {paso.comprobanteNumero} · Transacción {paso.referencia}
          </p>
          <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href={rutaComprobante(paso.comprobanteNumero)} className={`${botonPrimarioCss} text-center`}>
              Ver comprobante
            </Link>
            <button type="button" className={botonSecundarioCss} onClick={cerrar}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {paso.tipo === 'fallido' && (
        <div role="alert" className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{paso.mensaje}</p>
          <p className="text-xs text-zinc-500">El cobro sigue pendiente. No se realizó ningún cargo.</p>
          <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" className={botonPrimarioCss} onClick={() => setPaso({ tipo: 'formulario' })}>
              Intentar de nuevo
            </button>
            <button type="button" className={botonSecundarioCss} onClick={cerrar}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {paso.tipo === 'formulario' && (
        <form onSubmit={enviar} noValidate autoComplete="off" className="flex flex-col gap-4">
          <Campo id="tarjeta-titular" etiqueta="Titular" error={errores.titular}>
            <input
              id="tarjeta-titular"
              value={tarjeta.titular}
              onChange={(e) => cambiar('titular', e.target.value)}
              autoComplete="cc-name"
              maxLength={100}
              disabled={procesando}
              aria-invalid={Boolean(errores.titular)}
              className={campoCss}
            />
          </Campo>
          <Campo id="tarjeta-numero" etiqueta="Número de tarjeta" error={errores.numero}>
            <input
              id="tarjeta-numero"
              value={tarjeta.numero}
              onChange={(e) => cambiar('numero', formatearNumeroTarjeta(e.target.value))}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              disabled={procesando}
              aria-invalid={Boolean(errores.numero)}
              className={`${campoCss} font-mono`}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo id="tarjeta-vencimiento" etiqueta="Vencimiento" error={errores.vencimiento}>
              <input
                id="tarjeta-vencimiento"
                value={tarjeta.vencimiento}
                onChange={(e) => cambiar('vencimiento', formatearVencimiento(e.target.value))}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                maxLength={5}
                disabled={procesando}
                aria-invalid={Boolean(errores.vencimiento)}
                className={`${campoCss} font-mono`}
              />
            </Campo>
            <Campo id="tarjeta-cvv" etiqueta="Código de seguridad" error={errores.cvv}>
              <input
                id="tarjeta-cvv"
                type="password"
                value={tarjeta.cvv}
                onChange={(e) => cambiar('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                disabled={procesando}
                aria-invalid={Boolean(errores.cvv)}
                className={`${campoCss} font-mono`}
              />
            </Campo>
          </div>

          {errores.general && (
            <p role="alert" className="text-sm text-red-600">
              {errores.general}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={botonSecundarioCss} onClick={cerrar} disabled={procesando}>
              Cancelar
            </button>
            <button type="submit" className={botonPrimarioCss} disabled={procesando} aria-busy={procesando}>
              {procesando ? MENSAJES_PAGOS.procesando : `Pagar ${formatearPrecio(cobro.monto)}`}
            </button>
          </div>
          <p className="text-center text-xs text-zinc-500">
            Pasarela simulada. No se guarda el número de tu tarjeta ni el código de seguridad.
          </p>
        </form>
      )}
    </Modal>
  );
}

function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {error && <p className={errorCampoCss}>{error}</p>}
    </div>
  );
}
