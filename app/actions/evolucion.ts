"use server";

import { getSession } from "@/lib/session";
import type { Filtro, Resultado, Serie } from "@/lib/evolucion";

function baseApi(): string | null {
  const base = process.env.API_URL?.trim();
  return base ? `${base.replace(/\/+$/, "")}/api/v1` : null;
}

async function obtenerError(res: Response): Promise<string> {
  const data: unknown = await res.json().catch(() => null);
  if (data && typeof data === "object" && "message" in data) {
    const mensaje = (data as { message: unknown }).message;
    if (typeof mensaje === "string") return mensaje;
    if (Array.isArray(mensaje)) return mensaje.join(". ");
  }
  return res.status === 401 ? "Tu sesión expiró. Inicia sesión nuevamente."
    : res.status === 403 ? "Acceso denegado."
    : "No se pudo completar la solicitud.";
}

export async function consultarEvolucion(filtro: Filtro = {}): Promise<Resultado<Serie[]>> {
  const token = await getSession();
  if (!token) return { ok: false, error: "Inicia sesión para consultar tu progreso.", status: 401 };
  const base = baseApi();
  if (!base) return { ok: false, error: "Falta configurar API_URL." };
  const params = new URLSearchParams();
  if (filtro.tipo) params.set("tipo", filtro.tipo);
  if (filtro.desde) params.set("desde", filtro.desde);
  if (filtro.hasta) params.set("hasta", filtro.hasta);
  try {
    const res = await fetch(`${base}/progreso/mio?${params}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: await obtenerError(res), status: res.status };
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("series" in data) || !Array.isArray(data.series)) {
      return { ok: false, error: "La API devolvió un formato inesperado." };
    }
    return { ok: true, data: data.series as Serie[] };
  } catch {
    return { ok: false, error: "No se pudo conectar con el backend." };
  }
}

export async function editarProgreso(id: string, cambios: {
  fecha: string; valor: number; ejercicio?: string; repeticiones?: number;
}): Promise<Resultado<null>> {
  const token = await getSession();
  if (!token) return { ok: false, error: "Tu sesión expiró.", status: 401 };
  const base = baseApi();
  if (!base) return { ok: false, error: "Falta configurar API_URL." };
  try {
    const res = await fetch(`${base}/progreso/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cambios), cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: await obtenerError(res), status: res.status };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "No se pudo conectar con el backend." };
  }
}
