'use client';

import { useState } from 'react';
import { botonPrimarioCss, botonSecundarioCss, campoCss, errorCampoCss } from '@/components/clases/estilos';
import { rangoPorDefecto, validarRango, type RangoReporte } from '@/lib/reportes';

/**
 * FE-26.1 · Selector de rango de fechas de los reportes, reutilizable.
 * Por defecto los últimos 30 días; valida en el cliente las mismas reglas que
 * el backend (inicio no posterior al fin y máximo 12 meses).
 */
export function SelectorRango({
  rango,
  onAplicar,
  deshabilitado = false,
}: {
  rango: RangoReporte;
  onAplicar: (rango: RangoReporte) => void;
  deshabilitado?: boolean;
}) {
  const [borrador, setBorrador] = useState(rango);
  const [error, setError] = useState<string | null>(null);
  const cambiado = borrador.desde !== rango.desde || borrador.hasta !== rango.hasta;

  function aplicar(nuevo: RangoReporte) {
    const motivo = validarRango(nuevo);
    setError(motivo);
    if (!motivo) onAplicar(nuevo);
  }

  function ultimos30() {
    const porDefecto = rangoPorDefecto();
    setBorrador(porDefecto);
    aplicar(porDefecto);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        aplicar(borrador);
      }}
      className="flex flex-wrap items-end gap-3"
      aria-label="Rango de fechas"
      noValidate
    >
      <label className="text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Desde</span>
        <input
          type="date"
          value={borrador.desde}
          max={borrador.hasta}
          onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })}
          aria-invalid={Boolean(error)}
          className={`${campoCss} w-44`}
        />
      </label>
      <label className="text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Hasta</span>
        <input
          type="date"
          value={borrador.hasta}
          min={borrador.desde}
          onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
          aria-invalid={Boolean(error)}
          className={`${campoCss} w-44`}
        />
      </label>
      <button type="submit" disabled={deshabilitado || !cambiado} className={botonPrimarioCss}>
        Aplicar
      </button>
      <button type="button" onClick={ultimos30} disabled={deshabilitado} className={botonSecundarioCss}>
        Últimos 30 días
      </button>
      {error && (
        <p role="alert" className={`${errorCampoCss} basis-full`}>
          {error}
        </p>
      )}
    </form>
  );
}
