"use client";

import { useState } from "react";
import { FormularioRegistroProgreso } from "./formulario-registro-progreso";
import { VistaEvolucion } from "./vista-evolucion";

export function ProgresoMiembro() {
  const [revisionRegistro, setRevisionRegistro] = useState(0);

  return <>
    <FormularioRegistroProgreso onRegistrado={() => setRevisionRegistro((revision) => revision + 1)} />
    <VistaEvolucion revisionRegistro={revisionRegistro} />
  </>;
}
