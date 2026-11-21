import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { TipoClase } from '@/lib/clases';
import type { MiMembresia } from '@/lib/membresias';
import type { MiReserva } from '@/lib/reservas';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { MiMembresiaVista } from '@/components/membresias/mi-membresia';

export const metadata: Metadata = { title: 'Mi membresía | Madlions' };

/**
 * FE-3.1: estado de la membresía del miembro autenticado.
 * Rediseño (H7): además pide sus próximas reservas y el catálogo de tipos de
 * clase para mostrar los nombres de los incluidos. Si alguna de esas dos
 * consultas falla, la membresía se muestra igual, sin ese bloque.
 */
export default async function Page() {
  let membresia: MiMembresia | null = null;
  let error = '';
  let sesionVencida = false;

  // El miembro sale del token: la API nunca recibe un id de miembro.
  const [deMembresia, deReservas, deTipos] = await Promise.allSettled([
    api<MiMembresia>('membresias/mia'),
    api<MiReserva[]>('reservas/mias?estado=proximas'),
    api<TipoClase[]>('tipos-clase'),
  ]);

  if (deMembresia.status === 'fulfilled') membresia = deMembresia.value;
  else if (deMembresia.reason instanceof SesionInvalidaError) sesionVencida = true;
  else error = deMembresia.reason instanceof Error ? deMembresia.reason.message : '';

  if (sesionVencida) redirect('/login');
  if (!membresia) return <ErrorCarga mensaje={`No se pudo cargar tu membresía. ${error}`} />;

  const incluidos = new Set(membresia.tiposClaseIds ?? []);
  const tiposIncluidos =
    deTipos.status === 'fulfilled'
      ? deTipos.value.filter((tipo) => incluidos.has(tipo.id)).map(({ id, nombre }) => ({ id, nombre }))
      : [];

  return (
    <MiMembresiaVista
      membresia={membresia}
      proximas={deReservas.status === 'fulfilled' ? deReservas.value : []}
      tiposIncluidos={tiposIncluidos}
    />
  );
}
