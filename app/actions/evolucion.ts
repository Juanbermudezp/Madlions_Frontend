"use server";

import { api, ApiError } from "@/lib/api";
import { obtenerToken } from "@/lib/session";
import type { Filtro, Resultado, Serie } from "@/lib/evolucion";

export async function consultarEvolucion(filtro: Filtro = {}): Promise<Resultado<Serie[]>> {
  if (!(await obtenerToken())) return { ok: false, error: "Inicia sesión para consultar tu progreso.", status: 401 };
  const params = new URLSearchParams();
  if (filtro.tipo) params.set("tipo", filtro.tipo);
  if (filtro.desde) params.set("desde", filtro.desde);
  if (filtro.hasta) params.set("hasta", filtro.hasta);
  try {
    const data = await api<{ series: Serie[] }>(`progreso/mio?${params}`);
    if (!data || !Array.isArray(data.series)) {
      return { ok: false, error: "La API devolvió un formato inesperado." };
    }
    return { ok: true, data: data.series };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message, status: error.estado };
    return { ok: false, error: "No se pudo conectar con el backend." };
  }
}

export async function editarProgreso(id: string, cambios: {
  fecha: string; valor: number; ejercicio?: string; repeticiones?: number;
}): Promise<Resultado<null>> {
  if (!(await obtenerToken())) return { ok: false, error: "Tu sesión expiró.", status: 401 };
  try {
    await api(`progreso/${encodeURIComponent(id)}`, { method: "PATCH", body: cambios });
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message, status: error.estado };
    return { ok: false, error: "No se pudo conectar con el backend." };
  }
}
