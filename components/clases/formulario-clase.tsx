'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { guardarClase } from '@/app/actions/clases';
import {
  fechaLocal,
  horaLocal,
  validarClase,
  type ClaseAgenda,
  type DatosClase,
  type EntrenadorResumen,
  type ErroresFormulario,
  type TipoClase,
} from '@/lib/clases';
import { Modal } from './modal';
import { botonPrimarioCss, botonSecundarioCss, campoCss, errorCampoCss } from './estilos';

/** FE-4.2: formulario para programar (clase = null) o modificar una clase. */
export function FormularioClase({
  clase,
  fechaSugerida,
  tipos,
  entrenadores,
  onCerrar,
  onGuardado,
}: {
  clase: ClaseAgenda | null;
  fechaSugerida: string;
  tipos: TipoClase[];
  entrenadores: EntrenadorResumen[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [tipoClaseId, setTipoClaseId] = useState(clase?.tipo.id ?? '');
  const [entrenadorId, setEntrenadorId] = useState(clase?.entrenador.id ?? '');
  const [fecha, setFecha] = useState(clase ? fechaLocal(clase.inicio) : fechaSugerida);
  const [horaInicio, setHoraInicio] = useState(clase ? horaLocal(clase.inicio) : '');
  const [horaFin, setHoraFin] = useState(clase ? horaLocal(clase.fin) : '');
  const [cupo, setCupo] = useState(clase ? String(clase.cupoMaximo) : '');
  const [descripcion, setDescripcion] = useState(clase?.descripcion ?? '');
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, iniciar] = useTransition();

  const reservas = clase?.reservasConfirmadas ?? 0;

  // Si el tipo o el entrenador de la clase ya no está en la lista (por ejemplo,
  // se desactivó), igual se muestra para no perder el valor actual.
  const opcionesTipo =
    clase && !tipos.some((t) => t.id === clase.tipo.id)
      ? [...tipos, { ...clase.tipo, descripcion: '' }]
      : tipos;
  const opcionesEntrenador =
    clase && !entrenadores.some((e) => e.id === clase.entrenador.id)
      ? [...entrenadores, clase.entrenador]
      : entrenadores;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const datos: DatosClase = {
      tipoClaseId,
      entrenadorId,
      descripcion,
      fecha,
      horaInicio,
      horaFin,
      cupoMaximo: cupo.trim() === '' ? Number.NaN : Number(cupo),
    };
    const encontrados = validarClase(datos, { reservasConfirmadas: reservas });
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    iniciar(async () => {
      const resultado = await guardarClase(clase?.id ?? null, datos, reservas);
      if (resultado.ok) onGuardado(resultado.mensaje);
      else setErrores({ [resultado.campo ?? 'general']: resultado.error });
    });
  }

  return (
    <Modal
      abierto
      titulo={clase ? `Modificar ${clase.tipo.nombre}` : 'Nueva clase'}
      bloqueado={guardando}
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="clase-tipo" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="clase-tipo"
              value={tipoClaseId}
              onChange={(e) => setTipoClaseId(e.target.value)}
              aria-invalid={Boolean(errores.tipoClaseId)}
              className={campoCss}
            >
              <option value="">Elige un tipo</option>
              {opcionesTipo.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            {errores.tipoClaseId && <p className={errorCampoCss}>{errores.tipoClaseId}</p>}
          </div>

          <div>
            <label htmlFor="clase-entrenador" className="text-sm font-medium">
              Entrenador
            </label>
            <select
              id="clase-entrenador"
              value={entrenadorId}
              onChange={(e) => setEntrenadorId(e.target.value)}
              aria-invalid={Boolean(errores.entrenadorId)}
              className={campoCss}
            >
              <option value="">Elige un entrenador</option>
              {opcionesEntrenador.map((entrenador) => (
                <option key={entrenador.id} value={entrenador.id}>
                  {entrenador.nombre}
                </option>
              ))}
            </select>
            {errores.entrenadorId && <p className={errorCampoCss}>{errores.entrenadorId}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="clase-fecha" className="text-sm font-medium">
              Fecha
            </label>
            <input
              id="clase-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-invalid={Boolean(errores.fecha)}
              className={campoCss}
            />
          </div>
          <div>
            <label htmlFor="clase-inicio" className="text-sm font-medium">
              Hora de inicio
            </label>
            <input
              id="clase-inicio"
              type="time"
              step={300}
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              aria-invalid={Boolean(errores.horario)}
              className={campoCss}
            />
          </div>
          <div>
            <label htmlFor="clase-fin" className="text-sm font-medium">
              Hora de fin
            </label>
            <input
              id="clase-fin"
              type="time"
              step={300}
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              aria-invalid={Boolean(errores.horario)}
              className={campoCss}
            />
          </div>
        </div>
        {(errores.fecha || errores.horario) && (
          <p className={`${errorCampoCss} -mt-2`}>{errores.fecha ?? errores.horario}</p>
        )}

        <div>
          <label htmlFor="clase-cupo" className="text-sm font-medium">
            Cupo máximo
          </label>
          <input
            id="clase-cupo"
            type="number"
            inputMode="numeric"
            min={Math.max(1, reservas)}
            max={50}
            value={cupo}
            onChange={(e) => setCupo(e.target.value)}
            aria-invalid={Boolean(errores.cupoMaximo)}
            className={`${campoCss} sm:w-40`}
          />
          {clase && (
            <p className="mt-1 text-xs text-zinc-500">
              Reservas confirmadas: {reservas}. El cupo no puede ser menor.
            </p>
          )}
          {errores.cupoMaximo && <p className={errorCampoCss}>{errores.cupoMaximo}</p>}
        </div>

        <div>
          <label htmlFor="clase-descripcion" className="text-sm font-medium">
            Descripción <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <textarea
            id="clase-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={300}
            rows={2}
            aria-invalid={Boolean(errores.descripcion)}
            className={campoCss}
          />
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
