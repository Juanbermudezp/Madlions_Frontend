import type { Metadata } from 'next';
import Link from 'next/link';
import { VistaEvolucion } from '@/components/progreso/vista-evolucion';

export const metadata: Metadata = { title: 'Progreso del miembro | Madlions' };

/** Hereda el layout protegido ENTRENADOR; BE-14.2 autoriza la relación con el miembro. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="min-w-0 w-full max-w-5xl">
    <Link href="/entrenador/rutinas" className="text-sm underline">Volver a rutinas</Link>
    <h1 className="mt-4 text-2xl font-semibold">Progreso del miembro</h1>
    <p className="mt-2 text-sm text-zinc-500">Consulta su historial de mediciones y evolución.</p>
    <VistaEvolucion consulta={{ modo: 'entrenador', miembroId: id }} />
  </div>;
}
