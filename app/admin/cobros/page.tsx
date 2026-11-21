import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarCobrosAdmin } from '@/app/actions/cobros-admin';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { PanelCobros } from '@/components/cobros/panel-cobros';
import { FILTROS_INICIALES } from '@/lib/cobros-admin';

export const metadata: Metadata = { title: 'Cobros pendientes | Madlions' };

/** FE-13.1: panel de cobros pendientes y pagados (solo ADMINISTRADOR). */
export default async function Page() {
    const inicial = await listarCobrosAdmin(FILTROS_INICIALES);
    if (!inicial.ok && inicial.estado === 401) redirect('/login');
    // El layout ya limita /admin al administrador; si el backend igual responde
    // 403, no se muestra nada del panel.
    if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;

    return <PanelCobros inicial={inicial} generadoEn={new Date().toISOString()} />;
}