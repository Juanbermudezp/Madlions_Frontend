'use client';

import { useCallback, useState, useTransition, type FormEvent } from 'react';
import { desactivarPlan, guardarPlan } from '@/app/actions/planes';
import type { ErroresFormulario, TipoClase } from '@/lib/clases';
import {
  ETIQUETA_TIPO_PLAN,
  TIPOS_PLAN,
  formatearPrecio,
  validarPlan,
  type DatosPlan,
  type Plan,
  type TipoPlan,
} from '@/lib/planes';
import { Modal } from '@/components/clases/modal';
import { Notificacion } from '@/components/clases/notificacion';
import { PrecioClasePuntual } from './precio-clase-puntual';
import {
  botonPrimarioCss,
  botonSecundarioCss,
  campoCss,
  errorCampoCss,
} from '@/components/clases/estilos';

/** FE-1.1 y FE-1.2: administración de planes. */
export function Planes({
  planes,
  tiposClase,
  precioClasePuntual,
}: {
  planes: Plan[];
  tiposClase: TipoClase[];
  precioClasePuntual: string;
}) {
  // undefined = modal cerrado; null = plan nuevo; Plan = edición.
  const [editando, setEditando] = useState<Plan | null | undefined>(undefined);
  const [porDesactivar, setPorDesactivar] = useState<Plan | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  function avisar(texto: string) {
    setAviso({ texto, id: Date.now() });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Planes</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Planes que se venden en el gimnasio. Editar un plan no cambia las membresías ya vendidas.
          </p>
        </div>
        <button
          type="button"
          className={botonPrimarioCss}
          onClick={() => {
            setAviso(null);
            setEditando(null);
          }}
        >
          Nuevo plan
        </button>
      </div>
      {aviso && <Notificacion key={aviso.id} mensaje={aviso.texto} onCerrar={cerrarAviso} />}

      <PrecioClasePuntual precio={precioClasePuntual} onGuardado={avisar} />

      {planes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Aún no hay planes
        </p>
      ) : (
        <>
        {/* Móvil: una tarjeta por plan, para que Estado y las acciones queden a la vista. */}
        <ul className="flex flex-col gap-3 sm:hidden">
          {planes.map((plan) => (
            <li
              key={plan.id}
              className={`rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 ${plan.activo ? '' : 'text-zinc-500'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{plan.nombre}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {ETIQUETA_TIPO_PLAN[plan.tipo]} · {formatearPrecio(plan.precio)}
                  </p>
                </div>
                <EstadoPlan activo={plan.activo} />
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-zinc-500">Clases incluidas</dt>
                <dd>{plan.cantidadClases ?? '—'}</dd>
                <dt className="text-zinc-500">Tipos de clase</dt>
                <dd className="text-zinc-600 dark:text-zinc-400">
                  {plan.tiposClase.length > 0
                    ? plan.tiposClase.map((tipo) => tipo.nombre).join(', ')
                    : '—'}
                </dd>
              </dl>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className={`${botonSecundarioCss} flex-1`}
                  onClick={() => {
                    setAviso(null);
                    setEditando(plan);
                  }}
                >
                  Editar
                </button>
                {plan.activo && (
                  <button
                    type="button"
                    className={`${botonSecundarioCss} flex-1`}
                    onClick={() => {
                      setAviso(null);
                      setPorDesactivar(plan);
                    }}
                  >
                    Desactivar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Clases incluidas</th>
                <th className="px-4 py-3 font-medium">Tipos de clase</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {planes.map((plan) => (
                <tr key={plan.id} className={plan.activo ? undefined : 'text-zinc-500'}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{plan.nombre}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{ETIQUETA_TIPO_PLAN[plan.tipo]}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatearPrecio(plan.precio)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{plan.cantidadClases ?? '—'}</td>
                  <td className="min-w-40 px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {plan.tiposClase.length > 0
                      ? plan.tiposClase.map((tipo) => tipo.nombre).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoPlan activo={plan.activo} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={botonSecundarioCss}
                        onClick={() => {
                          setAviso(null);
                          setEditando(plan);
                        }}
                      >
                        Editar
                      </button>
                      {plan.activo && (
                        <button
                          type="button"
                          className={botonSecundarioCss}
                          onClick={() => {
                            setAviso(null);
                            setPorDesactivar(plan);
                          }}
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {editando !== undefined && (
        <FormularioPlan
          // key: el formulario se reinicia al abrirlo para otro plan.
          key={editando?.id ?? 'nuevo'}
          plan={editando}
          tiposClase={tiposClase}
          onCerrar={() => setEditando(undefined)}
          onGuardado={(mensaje) => {
            setEditando(undefined);
            avisar(mensaje);
          }}
        />
      )}

      {porDesactivar && (
        <ConfirmarDesactivar
          key={porDesactivar.id}
          plan={porDesactivar}
          onCerrar={() => setPorDesactivar(null)}
          onDesactivado={(mensaje) => {
            setPorDesactivar(null);
            avisar(mensaje);
          }}
        />
      )}
    </div>
  );
}

function EstadoPlan({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      Activo
    </span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      Inactivo
    </span>
  );
}

function FormularioPlan({
  plan,
  tiposClase,
  onCerrar,
  onGuardado,
}: {
  plan: Plan | null;
  tiposClase: TipoClase[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [nombre, setNombre] = useState(plan?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoPlan | ''>(plan?.tipo ?? '');
  const [precio, setPrecio] = useState(plan ? plan.precio.toFixed(2) : '');
  const [cantidadClases, setCantidadClases] = useState(plan?.cantidadClases?.toString() ?? '');
  const [beneficios, setBeneficios] = useState(plan?.beneficios ?? '');
  const [tiposClaseIds, setTiposClaseIds] = useState<string[]>(
    plan?.tiposClase.map((t) => t.id) ?? [],
  );
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, iniciar] = useTransition();

  // El catálogo trae los tipos activos; al editar se suman los que el plan ya
  // tiene aunque no estén en el catálogo, para no quitarlos sin querer.
  const opciones = [
    ...tiposClase.map(({ id, nombre }) => ({ id, nombre })),
    ...(plan?.tiposClase ?? []).filter((t) => !tiposClase.some((c) => c.id === t.id)),
  ];

  function alternarTipoClase(id: string) {
    setTiposClaseIds((actuales) =>
      actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id],
    );
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const datos: DatosPlan = { nombre, tipo, precio, cantidadClases, beneficios, tiposClaseIds };
    const encontrados = validarPlan(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    iniciar(async () => {
      const resultado = await guardarPlan(plan?.id ?? null, datos);
      if (resultado.ok) onGuardado(resultado.mensaje);
      else setErrores({ [resultado.campo ?? 'general']: resultado.error });
    });
  }

  return (
    <Modal
      abierto
      titulo={plan ? `Editar ${plan.nombre}` : 'Nuevo plan'}
      bloqueado={guardando}
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="plan-nombre" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="plan-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={60}
            aria-invalid={Boolean(errores.nombre)}
            className={campoCss}
            placeholder="Mensual ilimitado, Day pass…"
          />
          <p className="mt-1 text-right text-xs text-zinc-500">{nombre.trim().length}/60</p>
          {errores.nombre && <p className={errorCampoCss}>{errores.nombre}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="plan-tipo" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="plan-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoPlan | '')}
              disabled={Boolean(plan)}
              aria-invalid={Boolean(errores.tipo)}
              className={`${campoCss} disabled:opacity-60`}
            >
              <option value="">Elige el tipo</option>
              {TIPOS_PLAN.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {ETIQUETA_TIPO_PLAN[opcion]}
                </option>
              ))}
            </select>
            {plan && <p className="mt-1 text-xs text-zinc-500">El tipo no se puede cambiar.</p>}
            {errores.tipo && <p className={errorCampoCss}>{errores.tipo}</p>}
          </div>

          <div>
            <label htmlFor="plan-precio" className="text-sm font-medium">
              Precio (USD, IVA incluido)
            </label>
            <input
              id="plan-precio"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              aria-invalid={Boolean(errores.precio)}
              className={campoCss}
              placeholder="0.00"
            />
            {errores.precio && <p className={errorCampoCss}>{errores.precio}</p>}
          </div>
        </div>

        {tipo === 'SET_CLASES' && (
          <div>
            <label htmlFor="plan-cantidad" className="text-sm font-medium">
              Cantidad de clases
            </label>
            <input
              id="plan-cantidad"
              type="number"
              inputMode="numeric"
              min="1"
              max="100"
              step="1"
              value={cantidadClases}
              onChange={(e) => setCantidadClases(e.target.value)}
              aria-invalid={Boolean(errores.cantidadClases)}
              className={campoCss}
              placeholder="1 a 100"
            />
            {errores.cantidadClases && <p className={errorCampoCss}>{errores.cantidadClases}</p>}
          </div>
        )}

        <div>
          <label htmlFor="plan-beneficios" className="text-sm font-medium">
            Beneficios
          </label>
          <textarea
            id="plan-beneficios"
            value={beneficios}
            onChange={(e) => setBeneficios(e.target.value)}
            maxLength={500}
            rows={3}
            aria-invalid={Boolean(errores.beneficios)}
            className={campoCss}
          />
          <p className="mt-1 text-right text-xs text-zinc-500">{beneficios.trim().length}/500</p>
          {errores.beneficios && <p className={errorCampoCss}>{errores.beneficios}</p>}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Tipos de clase</legend>
          {opciones.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">Aún no hay tipos de clase en el catálogo.</p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {opciones.map((opcion) => (
                <label key={opcion.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tiposClaseIds.includes(opcion.id)}
                    onChange={() => alternarTipoClase(opcion.id)}
                    className="size-4 accent-zinc-900 dark:accent-zinc-100"
                  />
                  {opcion.nombre}
                </label>
              ))}
            </div>
          )}
          {errores.tiposClaseIds && <p className={errorCampoCss}>{errores.tiposClaseIds}</p>}
        </fieldset>

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

function ConfirmarDesactivar({
  plan,
  onCerrar,
  onDesactivado,
}: {
  plan: Plan;
  onCerrar: () => void;
  onDesactivado: (mensaje: string) => void;
}) {
  const [error, setError] = useState('');
  const [desactivando, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const resultado = await desactivarPlan(plan.id);
      if (resultado.ok) onDesactivado(resultado.mensaje);
      else setError(resultado.error);
    });
  }

  return (
    <Modal abierto titulo="Desactivar plan" bloqueado={desactivando} onCerrar={onCerrar}>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        ¿Desactivar el plan {plan.nombre}? No estará disponible para nuevas compras ni renovaciones.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={botonSecundarioCss} onClick={onCerrar} disabled={desactivando}>
          Cancelar
        </button>
        <button type="button" className={botonPrimarioCss} onClick={confirmar} disabled={desactivando}>
          {desactivando ? 'Desactivando…' : 'Desactivar'}
        </button>
      </div>
    </Modal>
  );
}
