'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  ESTADOS_MAQUINA,
  ETIQUETA_ESTADO_MAQUINA,
  ETIQUETA_TIPO_MAQUINA,
  ETIQUETA_ZONA_MAQUINA,
  TIPOS_MAQUINA,
  ZONAS_MAQUINA,
  filtrosDesdeParams,
  hayFiltros,
  hrefConFiltros,
  type CampoFiltro,
  type FiltrosMaquina,
} from '@/lib/maquinas';
import { botonSecundarioCss, campoCss } from '@/components/clases/estilos';

// FE-17.1: filtros por estado, tipo y zona.
export function FiltrosEquipo({
  filtros,
  rutaBase,
}: {
  filtros: FiltrosMaquina;
  rutaBase: string;
}) {
  const router = useRouter();
  const [filtrando, iniciar] = useTransition();

  function cambiar(campo: CampoFiltro, valor: string) {
    const siguientes = filtrosDesdeParams({ ...filtros, [campo]: valor });
    iniciar(() => router.replace(hrefConFiltros(rutaBase, siguientes), { scroll: false }));
  }

  return (
    <section
      aria-label="Filtros"
      aria-busy={filtrando}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <Lista
        campo="estado"
        etiqueta="Estado"
        valor={filtros.estado ?? ''}
        opciones={ESTADOS_MAQUINA}
        etiquetas={ETIQUETA_ESTADO_MAQUINA}
        alCambiar={cambiar}
      />
      <Lista
        campo="tipo"
        etiqueta="Tipo"
        valor={filtros.tipo ?? ''}
        opciones={TIPOS_MAQUINA}
        etiquetas={ETIQUETA_TIPO_MAQUINA}
        alCambiar={cambiar}
      />
      <Lista
        campo="zona"
        etiqueta="Zona"
        valor={filtros.zona ?? ''}
        opciones={ZONAS_MAQUINA}
        etiquetas={ETIQUETA_ZONA_MAQUINA}
        alCambiar={cambiar}
      />

      {hayFiltros(filtros) && (
        <button
          type="button"
          onClick={() => iniciar(() => router.replace(rutaBase, { scroll: false }))}
          disabled={filtrando}
          className={`${botonSecundarioCss} sm:mb-0.5`}
        >
          Quitar filtros
        </button>
      )}
    </section>
  );
}

function Lista<T extends string>({
  campo,
  etiqueta,
  valor,
  opciones,
  etiquetas,
  alCambiar,
}: {
  campo: CampoFiltro;
  etiqueta: string;
  valor: string;
  opciones: readonly T[];
  etiquetas: Record<T, string>;
  alCambiar: (campo: CampoFiltro, valor: string) => void;
}) {
  const id = `filtro-${campo}`;

  return (
    <div className="sm:w-48">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <select
        id={id}
        name={campo}
        value={valor}
        onChange={(evento) => alCambiar(campo, evento.target.value)}
        className={campoCss}
      >
        <option value="">Todos</option>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {etiquetas[opcion]}
          </option>
        ))}
      </select>
    </div>
  );
}
