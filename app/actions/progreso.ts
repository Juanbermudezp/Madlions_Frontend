"use server";

import { getSession } from "@/lib/session";
import type { CrearProgreso, ResultadoRegistro } from "@/lib/progreso";

/**
 * Server Action: protege el token httpOnly y lo reenvía al backend NestJS.
 * No expone datos de autenticación al navegador.
 */
export async function registrarProgreso(
  datos: CrearProgreso,
): Promise<ResultadoRegistro> {
  const token = await getSession();
  if (!token) {
    return { ok: false, error: "Tu sesión ha expirado. Inicia sesión nuevamente.", status: 401 };
  }

  const apiUrl = process.env.API_URL?.trim();
  if (!apiUrl) {
    return { ok: false, error: "Falta configurar API_URL en el frontend." };
  }

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/api/v1/progreso`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(datos),
        cache: "no-store",
      },
    );

    if (response.ok) return { ok: true };

    const body: unknown = await response.json().catch(() => null);
    const rawMessage =
      body && typeof body === "object" && "message" in body
        ? (body as { message?: unknown }).message
        : null;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === "string").join(". ")
      : typeof rawMessage === "string"
        ? rawMessage
        : "No se pudo registrar el progreso.";

    if (response.status === 401) {
      return { ok: false, error: "Tu sesión ha expirado. Inicia sesión nuevamente.", status: 401 };
    }
    if (response.status === 403) {
      return { ok: false, error: "No tienes permiso para registrar este progreso.", status: 403 };
    }
    if (response.status === 409) {
      return {
        ok: false,
        error: message || "Ya registraste esta medición en esa fecha.",
        status: 409,
      };
    }
    return { ok: false, error: message, status: response.status };
  } catch {
    return { ok: false, error: "No fue posible conectar con el servidor. Intenta de nuevo." };
  }
}
