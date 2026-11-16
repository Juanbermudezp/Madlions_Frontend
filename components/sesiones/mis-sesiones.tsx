import Link from 'next/link';
import { botonPrimarioCss } from '@/components/clases/estilos';
import {
    MENSAJES_SESIONES,
    RUTA_AGENDAR,
    RUTA_MIS_PAGOS,
    diaLocal,
    duracionMin,
    horaLocal,
    nombreDia,
    separarSesiones,
    type Sesion,
} from '@/lib/sesiones';

/**
 * FE-9.2 · Sesiones próximas y pasadas del miembro, con entrenador, fecha,
 * hora, duración y estado del cobro. Sin opción de cancelar (supuesto S9).
 */
export function MisSesiones({ sesiones }: { sesiones: Sesion[] }) {
    if (sesiones.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{MENSAJES_SESIONES.vacio}</p>
                <Link href={RUTA_AGENDAR} className={`${botonPrimarioCss} mt-4 inline-block`}>
                    Agendar sesión
                </Link>
            </div>
        );
    }

    const { proximas, pasadas } = separarSesiones(sesiones);

    return (
        <div className="flex flex-col gap-8">
            <ListaSesiones titulo="Próximas" sesiones={proximas} vacio="No tienes sesiones próximas." />
            <ListaSesiones titulo="Pasadas" sesiones={pasadas} vacio="Aún no tienes sesiones pasadas." />
        </div>
    );
}

function ListaSesiones({ titulo, sesiones, vacio }: { titulo: string; sesiones: Sesion[]; vacio: string }) {
    return (
        <section aria-labelledby={`titulo-${titulo}`}>
            <h2 id={`titulo-${titulo}`} className="mb-3 text-lg font-semibold">
                {titulo}
            </h2>
            {sesiones.length === 0 ? (
                <p className="text-sm text-zinc-500">{vacio}</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {sesiones.map((sesion) => (
                        <li key={sesion.id}>
                            <TarjetaSesion sesion={sesion} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function TarjetaSesion({ sesion }: { sesion: Sesion }) {
    return (
        <article className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div className="min-w-0">
                <p className="font-medium">{sesion.entrenador}</p>
                <p className="text-sm text-zinc-600 first-letter:uppercase dark:text-zinc-400">
                    {nombreDia(diaLocal(sesion.inicio))}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {horaLocal(sesion.inicio)} – {horaLocal(sesion.fin)} · {duracionMin(sesion)} min
                </p>
            </div>
            <EstadoCobro sesion={sesion} />
        </article>
    );
}

function EstadoCobro({ sesion }: { sesion: Sesion }) {
    if (sesion.cobro?.estado === 'PAGADO') {
        return (
            <span className="self-start rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 sm:self-center dark:bg-emerald-950 dark:text-emerald-200">
                Pagado
            </span>
        );
    }

    if (sesion.cobro?.estado === 'PENDIENTE') {
        return (
            <div className="flex items-center gap-3 self-start sm:self-center">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Pendiente · ${sesion.precio}
                </span>
                <Link href={RUTA_MIS_PAGOS} className="text-sm underline">
                    Ir a Mis pagos
                </Link>
            </div>
        );
    }

    return <span className="text-xs text-zinc-500">Sin cobro</span>;
}