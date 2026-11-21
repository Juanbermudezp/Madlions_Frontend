import { RutaProtegida } from '@/components/ruta-protegida';
import { Shell } from '@/components/shell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RutaProtegida roles={['ENTRENADOR']}>
      <Shell>{children}</Shell>
    </RutaProtegida>
  );
}
