import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarClasesReservables } from '@/app/actions/reservas';
import { ClasesDeLaSemana, type CreditosMiembro } from '@/components/reservas/clases-semana';
import { api } from '@/lib/api';
import type { MiMembresia } from '@/lib/membresias';

export const metadata: Metadata = { title: 'Clases de la semana | Madlions' };

/** Créditos del set del miembro para el encabezado. Si la consulta falla, la pantalla sigue sin el contador. */
async function obtenerCreditos(): Promise<CreditosMiembro | null> {
  try {
    const { creditosDisponibles, creditosTotales } = await api<MiMembresia>('membresias/mia');
    return creditosDisponibles !== null && creditosTotales !== null
      ? { disponibles: creditosDisponibles, totales: creditosTotales }
      : null;
  } catch {
    return null;
  }
}

/** FE-5.1: clases reservables de la semana actual (la siguiente se pide al cambiar de pestaña). */
export default async function Page() {
  const [inicial, creditos] = await Promise.all([listarClasesReservables('actual'), obtenerCreditos()]);
  if (!inicial.ok && inicial.error.startsWith('Tu sesión expiró')) redirect('/login');

  return <ClasesDeLaSemana inicial={inicial} creditos={creditos} />;
}
