import type { Metadata } from "next";
import { FormularioRegistroProgreso } from "@/components/progreso/formulario-registro-progreso";

export const metadata: Metadata = { title: "Mi progreso | Madlions" };

export default function ProgresoPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Mi progreso</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Registra tu peso, medidas corporales y marcas de entrenamiento.
        </p>
      </div>
      <FormularioRegistroProgreso />
      {/* FE-16.2 incorporará aquí la gráfica y el historial. */}
    </main>
  );
}
