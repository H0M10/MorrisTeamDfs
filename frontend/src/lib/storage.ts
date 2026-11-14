// Lo que se guarda en el dispositivo. Solo el id de la última parcela: nada personal.
// localStorage puede no existir o estar bloqueado, así que todo va con try/catch.
const LAST_PARCEL_KEY = "fieldshift:last-parcel";
const LANG_KEY = "fieldshift:lang";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // sin almacenamiento: la app sigue funcionando
  }
}

export const readLastParcelId = () => read(LAST_PARCEL_KEY);
export const saveLastParcelId = (id: string) => write(LAST_PARCEL_KEY, id);
export const readLang = () => read(LANG_KEY);
export const saveLang = (lang: string) => write(LANG_KEY, lang);
