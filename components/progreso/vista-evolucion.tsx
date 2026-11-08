"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { consultarEvolucion, editarProgreso } from "@/app/actions/evolucion";
import type { Filtro, Registro, Serie } from "@/lib/evolucion";
import type { TipoProgreso } from "@/lib/progreso";

const TIPOS: TipoProgreso[] = ["PESO", "CINTURA", "CADERA", "PECHO", "BRAZO", "MUSLO", "MARCA"];
const inputCss = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const label: Record<TipoProgreso, string> = {
  PESO: "Peso corporal", CINTURA: "Cintura", CADERA: "Cadera",
  PECHO: "Pecho", BRAZO: "Brazo", MUSLO: "Muslo", MARCA: "Marca",
};
const unidad = (tipo: TipoProgreso) => tipo === "PESO" || tipo === "MARCA" ? "kg" : "cm";
const decimal = (n: number) => n.toFixed(1);
const signo = (n: number) => `${n > 0 ? "+" : ""}${decimal(n)}`;
const clave = (serie: Serie) => `${serie.tipo}|${serie.ejercicio ?? ""}|${serie.repeticiones ?? ""}`;
const titulo = (serie: Serie) => serie.tipo === "MARCA"
  ? `${serie.ejercicio ?? "Marca"} (${serie.repeticiones} rep.)` : label[serie.tipo];
const fechaEs = (fecha: string) => fecha.slice(0, 10).split("-").reverse().join("/");
function hoyLocal() {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (k: string) => p.find((x) => x.type === k)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Se reutiliza sin controles de edición en una futura vista para entrenadores. */
export function GraficaProgreso({ serie }: { serie: Serie }) {
  const puntos = [...serie.registros].reverse();
  if (puntos.length === 0) return null;
  const max = Math.max(...puntos.map((p) => p.valor));
  const min = Math.min(...puntos.map((p) => p.valor));
  const rango = Math.max(max - min, 1);
  const coords = puntos.map((p, i) => ({
    ...p,
    x: puntos.length === 1 ? 340 : 38 + (i * 604) / (puntos.length - 1),
    y: 170 - ((p.valor - min) / rango) * 128,
  }));
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <svg className="w-full" viewBox="0 0 680 222" role="img" aria-label={`Gráfica de ${titulo(serie)}`}>
        {[42, 106, 170].map((y) => <line key={y} x1="38" x2="642" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" />)}
        {coords.length > 1 && <polyline points={coords.map((p) => `${p.x},${p.y}`).join(" ")} stroke="#0284c7" strokeWidth="3" strokeLinejoin="round" fill="none" />}
        {coords.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r="5" fill="#0284c7"><title>{`${fechaEs(p.fecha)}: ${decimal(p.valor)} ${unidad(serie.tipo)}`}</title></circle>)}
        <text x="38" y="20" fontSize="13" fill="currentColor">{`${decimal(max)} ${unidad(serie.tipo)}`}</text>
        <text x="38" y="196" fontSize="13" fill="currentColor">{`${decimal(min)} ${unidad(serie.tipo)}`}</text>
        <text x="38" y="215" fontSize="13" fill="currentColor">{fechaEs(puntos[0].fecha)}</text>
        {puntos.length > 1 && <text x="642" y="215" fontSize="13" fill="currentColor" textAnchor="end">{fechaEs(puntos[puntos.length - 1].fecha)}</text>}
      </svg>
      {puntos.length < 2 && <p className="text-center text-sm text-amber-700 dark:text-amber-300">Datos insuficientes para comparar</p>}
    </div>
  );
}

export function ResumenProgreso({ serie }: { serie: Serie }) {
  const tarjetas = [
    { nombre: "Primero", valor: serie.primero === null ? "—" : `${decimal(serie.primero)} ${unidad(serie.tipo)}` },
    { nombre: "Último", valor: serie.ultimo === null ? "—" : `${decimal(serie.ultimo)} ${unidad(serie.tipo)}` },
    { nombre: "Diferencia", valor: serie.diferencia === null ? "—" : `${signo(serie.diferencia)} ${unidad(serie.tipo)}` },
    { nombre: "Cambio", valor: serie.porcentaje === null ? "—" : `${signo(serie.porcentaje)} %` },
  ];
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tarjetas.map((t) => <div key={t.nombre} className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900"><p className="text-xs text-zinc-500">{t.nombre}</p><p className="mt-2 text-xl font-semibold">{t.valor}</p></div>)}</div>;
}

type Fila = { registro: Registro; serie: Serie };
export function HistorialProgreso({ series, soloLectura = false, onEditar }: {
  series: Serie[]; soloLectura?: boolean; onEditar?: (fila: Fila) => void;
}) {
  const filas = series.flatMap((serie) => serie.registros.map((registro) => ({ serie, registro })))
    .sort((a, b) => b.registro.fecha.localeCompare(a.registro.fecha) || titulo(a.serie).localeCompare(titulo(b.serie)));
  return <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800"><table className="w-full text-left text-sm">
    <thead className="bg-zinc-100 dark:bg-zinc-900"><tr><th className="p-3">Fecha</th><th className="p-3">Medición</th><th className="p-3">Valor</th>{!soloLectura && onEditar && <th className="p-3">Acción</th>}</tr></thead>
    <tbody>{filas.map((f) => <tr key={f.registro.id} className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="whitespace-nowrap p-3">{fechaEs(f.registro.fecha)}</td><td className="p-3">{titulo(f.serie)}</td>
      <td className="whitespace-nowrap p-3">{decimal(f.registro.valor)} {unidad(f.serie.tipo)}</td>
      {!soloLectura && onEditar && <td className="p-3"><button type="button" className="text-sky-700 underline dark:text-sky-400" onClick={() => onEditar(f)}>Editar</button></td>}
    </tr>)}</tbody>
  </table></div>;
}

export function VistaEvolucion({ seriesExternas, soloLectura = false }: {
  seriesExternas?: Serie[]; soloLectura?: boolean;
}) {
  const [tipo, setTipo] = useState<TipoProgreso | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtro, setFiltro] = useState<Filtro>({});
  const [version, setVersion] = useState(0);
  const [seriesCargadas, setSeriesCargadas] = useState<Serie[]>([]);
  const [cargando, setCargando] = useState(!seriesExternas);
  const [error, setError] = useState("");
  const [seleccion, setSeleccion] = useState("");
  const [edicion, setEdicion] = useState<Fila | null>(null);
  const [fechaEditar, setFechaEditar] = useState("");
  const [valorEditar, setValorEditar] = useState("");
  const [ejercicioEditar, setEjercicioEditar] = useState("");
  const [repsEditar, setRepsEditar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    if (seriesExternas) return;
    let vivo = true;
    consultarEvolucion(filtro).then((r) => {
      if (!vivo) return;
      if (r.ok) { setSeriesCargadas(r.data); setError(""); }
      else setError(r.error);
      setCargando(false);
    }).catch(() => { if (vivo) { setError("No se pudo consultar el progreso."); setCargando(false); } });
    return () => { vivo = false; };
  }, [filtro, version, seriesExternas]);

  const recargar = useCallback(() => {
    setCargando(true); setVersion((v) => v + 1);
  }, []);
  const series = seriesExternas ?? seriesCargadas;
  const actual = series.find((s) => clave(s) === seleccion) ?? series[0];

  function filtrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (desde && hasta && desde > hasta) { setError("La fecha desde no puede ser posterior a hasta."); return; }
    setSeleccion(""); setError(""); setCargando(true);
    setFiltro({ ...(tipo ? { tipo } : {}), ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) });
  }
  function abrirEdicion(f: Fila) {
    setEdicion(f); setFechaEditar(f.registro.fecha); setValorEditar(String(f.registro.valor));
    setEjercicioEditar(f.serie.ejercicio ?? ""); setRepsEditar(String(f.serie.repeticiones ?? "")); setErrorEdicion("");
  }
  async function guardarEdicion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edicion || guardando) return;
    const tipo = edicion.serie.tipo;
    const esMarca = tipo === "MARCA";
    const min = esMarca ? 0.5 : tipo === "PESO" ? 20 : 10;
    const max = esMarca ? 500 : tipo === "PESO" ? 300 : 250;
    const valor = Number(valorEditar);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEditar) || fechaEditar > hoyLocal()) { setErrorEdicion("Ingresa una fecha válida no futura."); return; }
    if (!/^\d+(?:\.\d)?$/.test(valorEditar) || valor < min || valor > max) { setErrorEdicion(`El valor debe estar entre ${min} y ${max} con máximo un decimal.`); return; }
    const reps = Number(repsEditar);
    if (esMarca && (!ejercicioEditar.trim() || ejercicioEditar.trim().length > 60 || !/^\d+$/.test(repsEditar) || reps < 1 || reps > 100)) {
      setErrorEdicion("La marca requiere un ejercicio de 1 a 60 caracteres y de 1 a 100 repeticiones."); return;
    }
    setGuardando(true);
    const resultado = await editarProgreso(edicion.registro.id, {
      fecha: fechaEditar, valor, ...(esMarca ? { ejercicio: ejercicioEditar.trim(), repeticiones: reps } : {}),
    });
    setGuardando(false);
    if (!resultado.ok) { setErrorEdicion(resultado.error); return; }
    setEdicion(null); setSeleccion(""); setExito("Medición actualizada"); recargar();
  }

  return <section className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Evolución de mi progreso</h2><p className="text-sm text-zinc-500">Compara tus registros con el punto de partida.</p></div>
      {!seriesExternas && <button type="button" className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={cargando} onClick={recargar}>Actualizar</button>}
    </div>
    {!seriesExternas && <form onSubmit={filtrar} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm">Tipo de medición<select className={inputCss} value={tipo} onChange={(e) => setTipo(e.target.value as TipoProgreso | "")}><option value="">Todos</option>{TIPOS.map((t) => <option key={t} value={t}>{label[t]}</option>)}</select></label>
      <label className="space-y-1 text-sm">Desde<input type="date" className={inputCss} value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
      <label className="space-y-1 text-sm">Hasta<input type="date" className={inputCss} value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
      <button type="submit" disabled={cargando} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">Aplicar filtros</button>
    </form>}
    {exito && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{exito}</p>}
    {cargando && <p role="status" className="py-6 text-center text-sm text-zinc-500">Cargando progreso...</p>}
    {!cargando && error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}<button type="button" className="ml-3 underline" onClick={recargar}>Reintentar</button></div>}
    {!cargando && !error && !series.length && <p className="rounded-lg bg-zinc-100 p-6 text-center text-sm dark:bg-zinc-900">Aún no registras tu progreso. Agrega tu primera medición para ver tu evolución.</p>}
    {!cargando && !error && actual && <>
      <label className="block max-w-md space-y-1 text-sm">Medición para comparar<select className={inputCss} value={clave(actual)} onChange={(e) => setSeleccion(e.target.value)}>{series.map((s) => <option key={clave(s)} value={clave(s)}>{titulo(s)}</option>)}</select></label>
      <ResumenProgreso serie={actual} /><GraficaProgreso serie={actual} />
      <h3 className="text-lg font-semibold">Historial de mediciones</h3>
      <HistorialProgreso series={series} soloLectura={soloLectura} onEditar={soloLectura ? undefined : abrirEdicion} />
    </>}
    {edicion && !soloLectura && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"><div role="dialog" aria-modal="true" aria-labelledby="editar-titulo" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 dark:bg-zinc-950">
      <h3 id="editar-titulo" className="text-xl font-semibold">Editar medición</h3><p className="text-sm text-zinc-500">{titulo(edicion.serie)}</p>
      <form onSubmit={guardarEdicion} className="mt-4 space-y-4">
        <label className="block space-y-1 text-sm">Fecha<input type="date" className={inputCss} max={hoyLocal()} required value={fechaEditar} onChange={(e) => setFechaEditar(e.target.value)} /></label>
        <label className="block space-y-1 text-sm">Valor ({unidad(edicion.serie.tipo)})<input type="number" className={inputCss} step="0.1" required value={valorEditar} onChange={(e) => setValorEditar(e.target.value)} /></label>
        {edicion.serie.tipo === "MARCA" && <><label className="block space-y-1 text-sm">Ejercicio<input type="text" className={inputCss} required maxLength={60} value={ejercicioEditar} onChange={(e) => setEjercicioEditar(e.target.value)} /></label><label className="block space-y-1 text-sm">Repeticiones<input type="number" className={inputCss} min="1" max="100" step="1" required value={repsEditar} onChange={(e) => setRepsEditar(e.target.value)} /></label></>}
        {errorEdicion && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{errorEdicion}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={guardando} className="rounded-lg border px-4 py-2 text-sm" onClick={() => setEdicion(null)}>Cancelar</button><button type="submit" disabled={guardando} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">{guardando ? "Guardando..." : "Guardar cambios"}</button></div>
      </form>
    </div></div>}
  </section>;
}
