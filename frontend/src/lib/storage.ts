// Lo que se guarda en el dispositivo: la última parcela, el idioma y las
// restricciones declaradas por parcela. Nada personal.
// localStorage puede no existir o estar bloqueado, así que todo va con try/catch.
const LAST_PARCEL_KEY = "fieldshift:last-parcel";
const LANG_KEY = "fieldshift:lang";
const CONSTRAINTS_KEY = (parcelId: string) => `fieldshift:constraints:${parcelId}`;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // sin almacenamiento: la app sigue funcionando
  }
}

export const readLastParcelId = () => read(LAST_PARCEL_KEY);
export const saveLastParcelId = (id: string) => write(LAST_PARCEL_KEY, id);
export const readLang = () => read(LANG_KEY);
export const saveLang = (lang: string) => write(LANG_KEY, lang);

/** Restricciones que el agricultor declaró para una parcela, o null si usa las de la parcela. */
export function readConstraints(parcelId: string): string | null {
  return read(CONSTRAINTS_KEY(parcelId));
}
export const saveConstraints = (parcelId: string, json: string | null) =>
  write(CONSTRAINTS_KEY(parcelId), json);

// Perfil de accesibilidad y unidades (P1-1, P1-5). Un solo JSON por dispositivo.
const A11Y_KEY = "fieldshift:a11y";
export const readA11yProfile = () => read(A11Y_KEY);
export const saveA11yProfile = (json: string) => write(A11Y_KEY, json);
