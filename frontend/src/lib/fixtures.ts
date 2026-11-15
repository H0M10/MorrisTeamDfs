// Respaldo local: la copia del fixture que viaja con la app.
// Se usa cuando la API no responde. Cada fixture se carga solo si se pide.
import type { Evaluation, PilotsResponse } from "./contract";

const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  "dv-nv-fixture-01": () => import("./contract/fixtures/diamond_valley.json"),
  "dv-nv-fixture-no-viable": () =>
    import("./contract/fixtures/no_viable_options.json"),
  "dv-nv-01": () => import("./contract/fixtures/diamond_valley.json"),
};

export const DEFAULT_PARCEL_ID = "dv-nv-fixture-01";
export const FIXTURE_PARCEL_IDS = [
  "dv-nv-fixture-01",
  "dv-nv-fixture-no-viable",
];

export async function loadFixture(
  parcelId: string,
): Promise<Evaluation | null> {
  const loader = LOADERS[parcelId];
  if (!loader) return null;
  return (await loader()).default as Evaluation;
}

export async function loadFixturePilots(): Promise<PilotsResponse> {
  const all = await Promise.all(FIXTURE_PARCEL_IDS.map(loadFixture));
  return {
    data_status: "fixture",
    pilots: all
      .filter((item): item is Evaluation => item !== null)
      .map((item) => ({
        id: item.parcel.id,
        name: item.parcel.name,
        center: item.parcel.center,
        area_ha: item.parcel.area_ha,
        region_mode: item.parcel.region_mode,
        has_viable_options: item.has_viable_options,
      })),
  };
}
