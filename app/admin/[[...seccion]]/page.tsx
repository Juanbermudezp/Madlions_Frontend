import { Pendiente } from '@/components/pendiente';

export default async function Page({
  params,
}: {
  params: Promise<{ seccion?: string[] }>;
}) {
  const { seccion } = await params;
  const ruta = seccion?.length ? `/admin/${seccion.join('/')}` : '/admin';
  return <Pendiente href={ruta} />;
}
