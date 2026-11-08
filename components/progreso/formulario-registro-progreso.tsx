"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registrarProgreso } from "@/app/actions/progreso";
import type { MedicionProgreso, TipoProgreso } from "@/lib/progreso";

type TipoSimple = Exclude<TipoProgreso, "MARCA">;
type MarcaFormulario = {
  id: number;
  ejercicio: string;
  carga: string;
  repeticiones: string;
};

const CAMPOS: Array<{
  tipo: TipoSimple;
  etiqueta: string;
  unidad: string;
  min: number;
  max: number;
}> = [
  { tipo: "PESO", etiqueta: "Peso corporal", unidad: "kg", min: 20, max: 300 },
  { tipo: "CINTURA", etiqueta: "Cintura", unidad: "cm", min: 10, max: 250 },
  { tipo: "CADERA", etiqueta: "Cadera", unidad: "cm", min: 10, max: 250 },
  { tipo: "PECHO", etiqueta: "Pecho", unidad: "cm", min: 10, max: 250 },
  { tipo: "BRAZO", etiqueta: "Brazo", unidad: "cm", min: 10, max: 250 },
  { tipo: "MUSLO", etiqueta: "Muslo", unidad: "cm", min: 10, max: 250 },
];

const CAMPOS_VACIOS: Record<TipoSimple, string> = {
  PESO: "",
  CINTURA: "",
  CADERA: "",
  PECHO: "",
  BRAZO: "",
  MUSLO: "",
};

const campoCss =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

function hoyEnElSalvador(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const obtener = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}

function parsearDecimal(valor: string, minimo: number, maximo: number): number | null {
  const limpio = valor.trim();
  if (!/^\d+(?:\.\d)?$/.test(limpio)) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo
    ? numero
    : null;
}

export function FormularioRegistroProgreso() {
  const router = useRouter();
  const siguienteId = useRef(1);
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState("");
  const [campos, setCampos] = useState<Record<TipoSimple, string>>({ ...CAMPOS_VACIOS });
  const [marcas, setMarcas] = useState<MarcaFormulario[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    if (!abierto) return;
    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviando) setAbierto(false);
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [abierto, enviando]);

  function limpiarFormulario() {
    setFecha(hoyEnElSalvador());
    setCampos({ ...CAMPOS_VACIOS });
    setMarcas([]);
    setError("");
  }

  function cerrar() {
    if (enviando) return;
    setAbierto(false);
    limpiarFormulario();
  }

  function actualizarMarca(id: number, propiedad: "ejercicio" | "carga" | "repeticiones", valor: string) {
    setMarcas((anteriores) =>
      anteriores.map((marca) =>
        marca.id === id ? { ...marca, [propiedad]: valor } : marca,
      ),
    );
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setExito("");

    const fechaActual = hoyEnElSalvador();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > fechaActual) {
      setError("La fecha no puede ser futura ni estar vacía.");
      return;
    }

    const mediciones: MedicionProgreso[] = [];
    for (const campo of CAMPOS) {
      const entrada = campos[campo.tipo].trim();
      if (!entrada) continue;
      const numero = parsearDecimal(entrada, campo.min, campo.max);
      if (numero === null) {
        setError(`${campo.etiqueta}: ingresa un valor entre ${campo.min} y ${campo.max}, con máximo un decimal.`);
        return;
      }
      mediciones.push({ tipo: campo.tipo, valor: numero });
    }

    const marcasRepetidas = new Set<string>();
    for (const marca of marcas) {
      const ejercicio = marca.ejercicio.trim();
      const carga = marca.carga.trim();
      const repeticiones = marca.repeticiones.trim();
      if (!ejercicio && !carga && !repeticiones) continue;

      const numeroCarga = parsearDecimal(carga, 0.5, 500);
      const numeroRepeticiones = Number(repeticiones);
      if (
        ejercicio.length < 1 ||
        ejercicio.length > 60 ||
        numeroCarga === null ||
        !/^\d+$/.test(repeticiones) ||
        !Number.isInteger(numeroRepeticiones) ||
        numeroRepeticiones < 1 ||
        numeroRepeticiones > 100
      ) {
        setError("Cada marca debe incluir ejercicio (máx. 60 caracteres), carga de 0.5 a 500 kg y entre 1 y 100 repeticiones.");
        return;
      }
      const clave = `${ejercicio.toLocaleLowerCase("es")}:${numeroRepeticiones}`;
      if (marcasRepetidas.has(clave)) {
        setError("No repitas el mismo ejercicio y número de repeticiones en una fecha.");
        return;
      }
      marcasRepetidas.add(clave);
      mediciones.push({ tipo: "MARCA", ejercicio, valor: numeroCarga, repeticiones: numeroRepeticiones });
    }

    if (!mediciones.length) {
      setError("Ingresa al menos una medición para guardar tu progreso.");
      return;
    }

    setEnviando(true);
    try {
      const resultado = await registrarProgreso({ fecha, mediciones });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      limpiarFormulario();
      setAbierto(false);
      setExito("Progreso registrado");
      router.refresh();
    } catch {
      setError("No se pudo registrar el progreso. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Registro de mediciones</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Guarda tus avances para comparar tu evolución.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExito("");
            setError("");
            setFecha(hoyEnElSalvador());
            setAbierto(true);
          }}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Registrar progreso
        </button>
      </div>
      {exito && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {exito}
        </p>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-progreso" className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-zinc-900 shadow-xl dark:bg-zinc-950 dark:text-zinc-100 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="titulo-progreso" className="text-xl font-semibold">Registrar progreso</h2>
                <p className="mt-1 text-sm text-zinc-500">Deja en blanco las mediciones que no quieras registrar.</p>
              </div>
              <button type="button" disabled={enviando} aria-label="Cerrar formulario" onClick={cerrar} className="rounded-lg px-2 py-1 text-xl hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800">×</button>
            </div>

            <form onSubmit={guardar} noValidate>
              <label className="block text-sm font-medium" htmlFor="fecha-progreso">Fecha del registro *</label>
              <input id="fecha-progreso" className={campoCss} type="date" required value={fecha} max={hoyEnElSalvador()} onChange={(evento) => setFecha(evento.target.value)} />

              <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Peso y medidas</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {CAMPOS.map((campo) => (
                  <label key={campo.tipo} className="block text-sm font-medium">
                    {campo.etiqueta} ({campo.unidad})
                    <input
                      type="number"
                      min={campo.min}
                      max={campo.max}
                      step="0.1"
                      inputMode="decimal"
                      className={campoCss}
                      placeholder={`${campo.min} - ${campo.max}`}
                      value={campos[campo.tipo]}
                      onChange={(evento) => setCampos((anterior) => ({ ...anterior, [campo.tipo]: evento.target.value }))}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Marcas de entrenamiento</h3>
                <button
                  type="button"
                  onClick={() => {
                    const id = siguienteId.current++;
                    setMarcas((anteriores) => [...anteriores, { id, ejercicio: "", carga: "", repeticiones: "" }]);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  + Agregar marca
                </button>
              </div>
              {marcas.length === 0 && <p className="mt-3 text-sm text-zinc-500">Aún no agregas marcas (opcional).</p>}
              <div className="mt-3 space-y-4">
                {marcas.map((marca, indice) => (
                  <div key={marca.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold">Marca {indice + 1}</p>
                      <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setMarcas((anteriores) => anteriores.filter((item) => item.id !== marca.id))}>Quitar</button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="text-sm font-medium">Ejercicio
                        <input className={campoCss} type="text" maxLength={60} placeholder="Ej. Sentadilla" value={marca.ejercicio} onChange={(evento) => actualizarMarca(marca.id, "ejercicio", evento.target.value)} />
                      </label>
                      <label className="text-sm font-medium">Carga (kg)
                        <input className={campoCss} type="number" min="0.5" max="500" step="0.1" inputMode="decimal" value={marca.carga} onChange={(evento) => actualizarMarca(marca.id, "carga", evento.target.value)} />
                      </label>
                      <label className="text-sm font-medium">Repeticiones
                        <input className={campoCss} type="number" min="1" max="100" step="1" inputMode="numeric" value={marca.repeticiones} onChange={(evento) => actualizarMarca(marca.id, "repeticiones", evento.target.value)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
              <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <button type="button" onClick={cerrar} disabled={enviando} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Cancelar</button>
                <button type="submit" disabled={enviando || !fecha} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {enviando ? "Guardando..." : "Guardar progreso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
