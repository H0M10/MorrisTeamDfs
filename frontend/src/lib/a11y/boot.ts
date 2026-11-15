// Script en línea para <head> (sin "use client": lo importa el layout del
// servidor como texto). Aplica el perfil guardado antes del primer pintado,
// para que la letra grande o el modo sol no parpadeen al cargar. Repite
// apply() de profile.tsx sin depender de React; si algo falla, no hace nada.
export const A11Y_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("fieldshift:a11y")||"null");if(p){var h=document.documentElement;if(p.textSize===1||p.textSize===2)h.setAttribute("data-text-size",String(p.textSize));if(p.sun===true)h.setAttribute("data-sun","");if(p.plain===true)h.setAttribute("data-plain","");if(p.readAloud===true)h.setAttribute("data-read-aloud","");if(p.reduceMotion===true)h.setAttribute("data-reduce-motion","");}}catch(e){}`;
