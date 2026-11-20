import { PestanasReportes } from '@/components/reportes/pestanas-reportes';

/**
 * FE-26.1 · Marco de la sección de reportes (solo ADMINISTRADOR: /admin ya
 * está protegido). Cada pestaña es una ruta: H27, H28 y H29 solo reemplazan su page.tsx.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Información de las clases, los ingresos, las membresías y los entrenadores para tomar decisiones.
        </p>
      </div>
      <PestanasReportes />
      {children}
    </div>
  );
}
