import type { KeyboardEvent } from 'react';

/** Refuerza el ciclo Tab del dialog nativo, incluso en navegadores que al
 * terminar el recorrido dejan el foco en la interfaz exterior del navegador.
 */
export function contenerFocoIngresos(evento: KeyboardEvent<HTMLDialogElement>) {
  if (evento.key !== 'Tab') return;
  const dialogo = evento.currentTarget;
  const candidatos = dialogo.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
  );
  const controles = [...candidatos].filter((elemento) => {
    for (let padre: HTMLElement | null = elemento; padre && padre !== dialogo; padre = padre.parentElement) {
      const estilo = getComputedStyle(padre);
      if (padre.hidden || estilo.display === 'none' || estilo.visibility === 'hidden') return false;
      if (padre.tagName === 'DETAILS' && !padre.hasAttribute('open') && padre.querySelector('summary') !== elemento) return false;
    }
    return true;
  });
  const primero = controles[0], ultimo = controles.at(-1);
  if (!primero || !ultimo) { evento.preventDefault(); dialogo.focus(); return; }
  if (evento.shiftKey && (document.activeElement === primero || document.activeElement === dialogo)) {
    evento.preventDefault(); ultimo.focus();
  } else if (!evento.shiftKey && (document.activeElement === ultimo || document.activeElement === dialogo)) {
    evento.preventDefault(); primero.focus();
  }
}
