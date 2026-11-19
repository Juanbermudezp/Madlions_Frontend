import type { Metadata } from 'next';
import { PaginaCalificar } from '@/components/resenas/pagina-calificar';

export const metadata: Metadata = { title: 'Pendientes de calificar | Madlions' };

// FE-20.1: calificación de clases y sesiones del miembro.
export default function Page() {
  return <PaginaCalificar />;
}
