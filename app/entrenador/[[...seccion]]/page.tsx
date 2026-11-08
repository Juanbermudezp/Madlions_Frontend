import { Pendiente } from '@/components/pendiente';

export default async function Page({
  params,
}: {
  params: Promise<{ seccion?: string[] }>;
}) {
  const { seccion } = await params;
  const ruta = seccion?.length ? `/entrenador/${seccion.join('/')}` : '/entrenador';
  return <Pendiente href={ruta} />;
}
