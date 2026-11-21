"use server";

import { api, ApiError } from "@/lib/api";
import { obtenerToken } from "@/lib/session";
import type { CrearProgreso, ResultadoRegistro } from "@/lib/progreso";

export async function registrarProgreso(datos: CrearProgreso): Promise<ResultadoRegistro> {
  if (!(await obtenerToken())) {
    return { ok: false, error: "Tu sesión ha expirado. Inicia sesión nuevamente.", status: 401 };
  }
  try {
    await api("progreso", { method: "POST", body: datos });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message, status: error.estado };
    return { ok: false, error: "No fue posible conectar con el servidor. Intenta de nuevo." };
  }
}
