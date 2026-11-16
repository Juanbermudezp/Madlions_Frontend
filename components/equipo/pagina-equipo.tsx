import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import {
  consultaMaquinas,
  type FiltrosMaquina,
  type InventarioMaquinas,
} from '@/lib/maquinas';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { InventarioEquipo } from './inventario-equipo';

// Carga el inventario en el servidor (con el token de la cookie) y lo entrega a la vista.
export async function PaginaEquipo({
  filtros,
  rutaBase,
}: {
  filtros: FiltrosMaquina;
  rutaBase: string;
}) {
  let inventario: InventarioMaquinas | null = null;
  let error = '';
  let sesionVencida = false;

  try {
    inventario = await api<InventarioMaquinas>(`maquinas${consultaMaquinas(filtros)}`);
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : '';
  }

  if (sesionVencida) redirect('/login');
  if (!inventario) {
    return <ErrorCarga mensaje={`No se pudo cargar el estado del equipo. ${error}`} />;
  }

  return (
    <InventarioEquipo
      resumen={inventario.resumen}
      maquinas={inventario.maquinas}
      filtros={filtros}
      rutaBase={rutaBase}
    />
  );
}
