'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { listarCobrosAdmin } from '@/app/actions/cobros-admin';
import { botonPrimarioCss, botonSecundarioCss, campoCss } from '@/components/clases/estilos';
import {
    BUSQUEDA_MAX,
    COBROS_POR_PAGINA,
    CONCEPTOS,
    ETIQUETA_CONCEPTO,
    FILTROS_INICIALES,
    MENSAJES_COBROS_ADMIN,
    REFRESCO_MS,
    esNoHabilitado,
    horaActualizacion,
    totalPaginas,
    type CobroAdmin,
    type ConceptoCobro,
    type EstadoCobro,
    type FiltrosCobros,
    type PaginaCobros,
    type Resultado,
} from '@/lib/cobros-admin';
import { formatearFecha } from '@/lib/membresias';
import { fechaDePago, fechaHoraDePago } from '@/lib/pagos';
import { formatearPrecio } from '@/lib/planes';

const PESTANAS: { estado: EstadoCobro; etiqueta: string }[] = [
    { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
    { estado: 'PAGADO', etiqueta: 'Pagados' },
];

/**
 * FE-13.1 · Panel de cobros del administrador: pestañas Pendientes y Pagados,
 * búsqueda por miembro, filtro por concepto, tarjetas con la cantidad y la
 * suma del conjunto filtrado, paginación de 20 y actualización cada 30 s o
 * con "Actualizar".
 */
export function PanelCobros({
    inicial,
    generadoEn,
}: {
    inicial: Resultado<PaginaCobros>;
    /** ISO de la primera consulta (la hace el servidor). */
    generadoEn: string;
}) {
    const router = useRouter();
    const [filtros, setFiltros] = useState<FiltrosCobros>(FILTROS_INICIALES);
    const [texto, setTexto] = useState('');
    // null = cargando (cambio de pestaña, filtro o página) o acceso denegado.
    const [datos, setDatos] = useState<PaginaCobros | null>(inicial.ok ? inicial.datos : null);
    const [error, setError] = useState<{ mensaje: string; estado?: number } | null>(
        inicial.ok ? null : { mensaje: inicial.error, estado: inicial.estado },
    );
    const [actualizadoEn, setActualizadoEn] = useState(generadoEn);
    const [cargando, iniciar] = useTransition();
    // Filtros vigentes, para la actualización automática.
    const filtrosRef = useRef(filtros);
    // Evita mostrar una respuesta vieja si el administrador cambió de filtro rápido.
    const ultima = useRef(0);

    /** Consulta la API. `limpiar` = mostrar el estado de carga en vez de los datos anteriores. */
    const cargar = useCallback(
        (pedidos: FiltrosCobros, limpiar: boolean) => {
            const consulta = ++ultima.current;
            filtrosRef.current = pedidos;
            if (limpiar) setDatos(null);

            iniciar(async () => {
                let usados = pedidos;
                let resultado = await listarCobrosAdmin(usados);
                // La página quedó vacía (p. ej. se pagaron cobros): se va a la última que tiene datos.
                if (resultado.ok && resultado.datos.items.length === 0 && resultado.datos.total > 0 && usados.pagina > 1) {
                    usados = { ...usados, pagina: totalPaginas(resultado.datos.total) };
                    resultado = await listarCobrosAdmin(usados);
                }
                if (consulta !== ultima.current) return;

                if (resultado.ok) {
                    filtrosRef.current = usados;
                    setFiltros(usados);
                    setDatos(resultado.datos);
                    setError(null);
                    setActualizadoEn(new Date().toISOString());
                    return;
                }
                if (resultado.estado === 401) {
                    router.replace('/login');
                    return;
                }
                // Con 403 no queda ningún dato administrativo a la vista.
                if (resultado.estado === 403) setDatos(null);
                setError({ mensaje: resultado.error, estado: resultado.estado });
            });
        },
        [router],
    );

    // Los pagos que hacen los miembros aparecen solos cada 30 segundos.
    useEffect(() => {
        const intervalo = setInterval(() => cargar(filtrosRef.current, false), REFRESCO_MS);
        return () => clearInterval(intervalo);
    }, [cargar]);

    function aplicar(cambios: Partial<FiltrosCobros>) {
        const nuevos = { ...filtros, pagina: 1, ...cambios };
        setFiltros(nuevos);
        cargar(nuevos, true);
    }

    function buscar(evento: React.FormEvent) {
        evento.preventDefault();
        aplicar({ q: texto.trim() });
    }

    function limpiarBusqueda() {
        setTexto('');
        if (filtros.q) aplicar({ q: '' });
    }

    const accesoDenegado = error?.estado === 403;
    const paginas = datos ? totalPaginas(datos.total) : 1;
    const pendientes = filtros.estado === 'PENDIENTE';

    return (
        <div className="flex w-full flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Cobros pendientes</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Consulta los cobros pendientes y pagados de los miembros.
                    </p>
                </div>
                {!accesoDenegado && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500" aria-live="polite">
                            Actualizado a las {horaActualizacion(new Date(actualizadoEn))}
                        </span>
                        <button
                            type="button"
                            onClick={() => cargar(filtros, false)}
                            disabled={cargando}
                            className={botonSecundarioCss}
                        >
                            {cargando ? 'Actualizando…' : 'Actualizar'}
                        </button>
                    </div>
                )}
            </header>

            {accesoDenegado ? (
                <MensajeError mensaje={MENSAJES_COBROS_ADMIN.accesoDenegado} />
            ) : (
                <>
                    <div
                        role="tablist"
                        aria-label="Estado de los cobros"
                        className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
                    >
                        {PESTANAS.map(({ estado, etiqueta }) => {
                            const activa = estado === filtros.estado;
                            return (
                                <button
                                    key={estado}
                                    type="button"
                                    role="tab"
                                    id={`pestana-${estado}`}
                                    aria-selected={activa}
                                    aria-controls="panel-cobros"
                                    onClick={() => !activa && aplicar({ estado })}
                                    className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${activa
                                            ? 'border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    {etiqueta}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <form onSubmit={buscar} className="flex flex-1 items-end gap-2" role="search">
                            <label className="flex-1 text-sm">
                                Buscar miembro
                                <input
                                    type="search"
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    maxLength={BUSQUEDA_MAX}
                                    placeholder="Nombre o código (MBR-000001)"
                                    className={campoCss}
                                />
                            </label>
                            <button type="submit" disabled={cargando} className={botonPrimarioCss}>
                                Buscar
                            </button>
                            {(texto || filtros.q) && (
                                <button type="button" onClick={limpiarBusqueda} className={botonSecundarioCss}>
                                    Limpiar
                                </button>
                            )}
                        </form>

                        <label className="text-sm sm:w-56">
                            Concepto
                            <select
                                value={filtros.concepto}
                                onChange={(e) => aplicar({ concepto: e.target.value as ConceptoCobro | '' })}
                                className={campoCss}
                            >
                                <option value="">Todos</option>
                                {CONCEPTOS.map((concepto) => (
                                    <option key={concepto} value={concepto}>
                                        {ETIQUETA_CONCEPTO[concepto]}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Tarjeta
                            titulo={pendientes ? 'Cobros pendientes' : 'Cobros pagados'}
                            valor={datos ? String(datos.total) : '—'}
                        />
                        <Tarjeta titulo="Suma total" valor={datos ? formatearPrecio(datos.sumaMontos) : '—'} />
                    </div>

                    {error && datos && (
                        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                            No se pudo actualizar la lista. {error.mensaje}
                        </p>
                    )}

                    <div role="tabpanel" id="panel-cobros" aria-labelledby={`pestana-${filtros.estado}`} aria-busy={cargando}>
                        {!datos ? (
                            error ? (
                                <MensajeError mensaje={error.mensaje} onReintentar={() => cargar(filtros, true)} />
                            ) : (
                                <CargandoTabla />
                            )
                        ) : datos.items.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                                {pendientes ? MENSAJES_COBROS_ADMIN.sinPendientes : MENSAJES_COBROS_ADMIN.sinPagados}
                            </p>
                        ) : (
                            <>
                                <TablaCobros cobros={datos.items} pendientes={pendientes} />
                                <Paginacion
                                    pagina={datos.pagina}
                                    paginas={paginas}
                                    total={datos.total}
                                    deshabilitada={cargando}
                                    onIr={(pagina) => {
                                        const nuevos = { ...filtros, pagina };
                                        setFiltros(nuevos);
                                        cargar(nuevos, true);
                                    }}
                                />
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{titulo}</p>
            <p className="mt-1 text-2xl font-semibold">{valor}</p>
        </div>
    );
}

function TablaCobros({ cobros, pendientes }: { cobros: CobroAdmin[]; pendientes: boolean }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                    <tr>
                        <th scope="col" className="px-4 py-3 font-medium">Miembro</th>
                        <th scope="col" className="px-4 py-3 font-medium">Código</th>
                        <th scope="col" className="px-4 py-3 font-medium">Concepto</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">Monto</th>
                        <th scope="col" className="px-4 py-3 font-medium">Creado</th>
                        <th scope="col" className="px-4 py-3 font-medium">{pendientes ? 'Habilitación' : 'Pagado'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {cobros.map((cobro) => (
                        <tr key={cobro.id}>
                            <td className="px-4 py-3 font-medium">{cobro.miembro.nombre}</td>
                            <td className="px-4 py-3 font-mono text-xs">{cobro.miembro.codigo}</td>
                            <td className="px-4 py-3">
                                <p>{ETIQUETA_CONCEPTO[cobro.concepto]}</p>
                                <p className="text-xs text-zinc-500">{cobro.detalle}</p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{formatearPrecio(cobro.monto)}</td>
                            <td className="px-4 py-3">{fechaDePago(cobro.creadoEn)}</td>
                            <td className="px-4 py-3">{pendientes ? <Habilitacion cobro={cobro} /> : <Pago cobro={cobro} />}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Habilitacion({ cobro }: { cobro: CobroAdmin }) {
    if (esNoHabilitado(cobro)) {
        return (
            <div className="flex flex-col items-start gap-1">
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                    {MENSAJES_COBROS_ADMIN.noHabilitado}
                </span>
                <span className="text-xs text-zinc-500">Desde el {formatearFecha(cobro.habilitadoDesde!)}</span>
            </div>
        );
    }
    return <span>{cobro.habilitadoDesde ? formatearFecha(cobro.habilitadoDesde) : '—'}</span>;
}

function Pago({ cobro }: { cobro: CobroAdmin }) {
    if (!cobro.pagadoEn) return <span>—</span>;
    return (
        <div>
            <p>{fechaHoraDePago(cobro.pagadoEn)}</p>
            {cobro.referencia && <p className="font-mono text-xs text-zinc-500">{cobro.referencia}</p>}
        </div>
    );
}

function Paginacion({
    pagina,
    paginas,
    total,
    deshabilitada,
    onIr,
}: {
    pagina: number;
    paginas: number;
    total: number;
    deshabilitada: boolean;
    onIr: (pagina: number) => void;
}) {
    const desde = (pagina - 1) * COBROS_POR_PAGINA + 1;
    const hasta = Math.min(pagina * COBROS_POR_PAGINA, total);
    return (
        <nav aria-label="Paginación" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
                Mostrando {desde}–{hasta} de {total}
            </span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onIr(pagina - 1)}
                    disabled={deshabilitada || pagina <= 1}
                    className={botonSecundarioCss}
                >
                    Anterior
                </button>
                <span>
                    Página {pagina} de {paginas}
                </span>
                <button
                    type="button"
                    onClick={() => onIr(pagina + 1)}
                    disabled={deshabilitada || pagina >= paginas}
                    className={botonSecundarioCss}
                >
                    Siguiente
                </button>
            </div>
        </nav>
    );
}

function CargandoTabla() {
    return (
        <div className="flex flex-col gap-3" aria-live="polite">
            <p className="text-sm text-zinc-500">Cargando…</p>
            <div className="h-10 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-64 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
    );
}

function MensajeError({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
            <p className="text-sm text-red-700 dark:text-red-300">{mensaje}</p>
            {onReintentar && (
                <button type="button" onClick={onReintentar} className={`${botonPrimarioCss} mt-4`}>
                    Reintentar
                </button>
            )}
        </div>
    );
}