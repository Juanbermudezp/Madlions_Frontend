import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CalendarioHorarios } from "./calendario-horarios";

export const metadata: Metadata = {
    title: "Mis horarios",
};

function rolDelToken(token: string): string | null {
    try {
        const payload = JSON.parse(
            Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
        ) as { rol?: unknown };
        return typeof payload.rol === "string" ? payload.rol : null;
    } catch {
        return null;
    }
}

export default async function HorariosPage() {
    const token = await getSession();
    if (!token || rolDelToken(token) !== "ENTRENADOR") {
        redirect("/");
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
            <h1 className="mb-4 text-2xl font-semibold">Mis horarios</h1>
            <CalendarioHorarios />
        </main>
    );
}