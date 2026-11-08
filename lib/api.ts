import { getSession } from "@/lib/session";

export type ResultadoApi<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; error: string };

export async function apiFetch<T>(
    ruta: string,
    init: RequestInit = {},
): Promise<ResultadoApi<T>> {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
        throw new Error("Falta la variable de entorno API_URL.");
    }

    const token = await getSession();
    const res = await fetch(new URL(ruta, apiUrl.replace(/\/?$/, "/")), {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init.headers,
        },
        cache: "no-store",
    });

    if (res.status === 204) {
        return { ok: true, data: undefined as T };
    }

    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        return { ok: false, status: res.status, error: mensajeDeError(res.status, body) };
    }
    return { ok: true, data: body as T };
}

/** Los errores de NestJS traen `message` como texto o como lista de textos. */
function mensajeDeError(status: number, body: unknown): string {
    if (status === 401) {
        return "Tu sesión expiró. Vuelve a iniciar sesión.";
    }
    const message = (body as { message?: unknown } | null)?.message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
    return "Ocurrió un error. Intenta de nuevo.";
}