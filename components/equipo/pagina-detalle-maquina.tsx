import { notFound, redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { CambioDeEstado, InventarioMaquinas, Maquina } from '@/lib/maquinas';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { DetalleMaquina } from './detalle-maquina';

/**
 * Carga la máquina y su historial en el servidor. La máquina sale del
 * listado, que ya trae los datos internos del administrador y del entrenador:
 * el inventario es chico y BE-18.1 no agregó un endpoint por máquina.
 */
export async function PaginaDetalleMaquina({
  id,
  rutaBase,
}: {
  id: string;
  rutaBase: string;
}) {
  let maquina: Maquina | undefined;
  let historial: CambioDeEstado[] = [];
  let error = '';
  let sesionVencida = false;
  let noExiste = false;

  try {
    const [inventario, cambios] = await Promise.all([
      api<InventarioMaquinas>('maquinas'),
      api<CambioDeEstado[]>(`maquinas/${id}/historial`),
    ]);
    maquina = inventario.maquinas.find((m) => m.id === id);
    historial = cambios;
    if (!maquina) noExiste = true;
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else if (e instanceof Error && 'estado' in e && e.estado === 404) noExiste = true;
    else error = e instanceof Error ? e.message : '';
  }

  // redirect() y notFound() lanzan excepciones de control: van fuera del try.
  if (sesionVencida) redirect('/login');
  if (noExiste) notFound();
  if (!maquina) {
    return <ErrorCarga mensaje={`No se pudo cargar la máquina. ${error}`} />;
  }

  return <DetalleMaquina maquina={maquina} historial={historial} rutaBase={rutaBase} />;
}
