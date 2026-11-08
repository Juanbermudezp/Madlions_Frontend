"use server";

import { apiFetch } from "@/lib/api";
import type { Bloque, Clase, DatosBloque, Resultado } from "./tipos";

const SIN_CONEXION = "No se pudo conectar con el servidor. Intenta de nuevo.";

export async function obtenerSemana(
    semana: string,
): Promise<Resultado<{ bloques: Bloque[]; clases: Clase[] }>> {
    try {
        const query = `?semana=${encodeURIComponent(semana)}`;
        const [bloques, clases] = await Promise.all([
            apiFetch<Bloque[]>(`bloques/mios${query}`),
            apiFetch<Clase[]>(`clases/mias${query}`),
        ]);
        if (!bloques.ok) return { ok: false, error: bloques.error };
        if (!clases.ok) return { ok: false, error: clases.error };
        return { ok: true, data: { bloques: bloques.data, clases: clases.data } };
    } catch {
        return { ok: false, error: SIN_CONEXION };
    }
}

export async function crearBloque(datos: DatosBloque): Promise<Resultado> {
    try {
        const resultado = await apiFetch<Bloque>("bloques", {
            method: "POST",
            body: JSON.stringify(datos),
        });
        return resultado.ok ? { ok: true, data: undefined } : { ok: false, error: resultado.error };
    } catch {
        return { ok: false, error: SIN_CONEXION };
    }
}

export async function eliminarBloque(id: string): Promise<Resultado> {
    try {
        const resultado = await apiFetch<void>(`bloques/${encodeURIComponent(id)}`, {
            method: "DELETE",
        });
        return resultado.ok ? { ok: true, data: undefined } : { ok: false, error: resultado.error };
    } catch {
        return { ok: false, error: SIN_CONEXION };
    }
}