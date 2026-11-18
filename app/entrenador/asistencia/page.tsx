import type { Metadata } from 'next';
import { PaginaAsistencia } from '@/components/asistencia/pagina-asistencia';

export const metadata: Metadata = { title: 'Asistencia | Madlions' };

// FE-19.1: registro de asistencia del entrenador.
export default function Page() {
  return <PaginaAsistencia />;
}
