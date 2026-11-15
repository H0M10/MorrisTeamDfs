// Figuras del área a analizar en vivo. Anillos en [lon, lat] (el orden de GeoJSON y de la API).
export type Ring = [number, number][];
export type ShapeMode = "circle" | "square" | "draw";

const M_PER_DEG = 111_195;

export function circleRing(
  lat: number,
  lon: number,
  radiusM: number,
  points = 48,
): Ring {
  const ring: Ring = [];
  for (let i = 0; i < points; i++) {
    const angle = (2 * Math.PI * i) / points;
    ring.push([
      lon +
        (radiusM * Math.cos(angle)) /
          (M_PER_DEG * Math.cos((lat * Math.PI) / 180)),
      lat + (radiusM * Math.sin(angle)) / M_PER_DEG,
    ]);
  }
  return ring;
}

export function squareRing(lat: number, lon: number, sideM: number): Ring {
  const dLat = sideM / 2 / M_PER_DEG;
  const dLon = sideM / 2 / (M_PER_DEG * Math.cos((lat * Math.PI) / 180));
  return [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
  ];
}

/** Centro y área (ha) con una proyección local plana, como el motor. */
export function centerAndAreaHa(ring: Ring): {
  lat: number;
  lon: number;
  areaHa: number;
} {
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const lon0 = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const kx = M_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  let twice = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i] as [number, number];
    const [x2, y2] = ring[(i + 1) % ring.length] as [number, number];
    twice +=
      (x1 - lon0) * kx * (y2 - lat0) * M_PER_DEG -
      (x2 - lon0) * kx * (y1 - lat0) * M_PER_DEG;
  }
  return { lat: lat0, lon: lon0, areaHa: Math.abs(twice) / 2 / 10_000 };
}

// Cómo se pidió cada área en vivo, para volver a pedirla si el servidor la perdió
// en un despliegue. Solo coordenadas: nada personal.
const KEY = (id: string) => `fieldshift:live:${id}`;

export interface LiveRequest {
  lat: number;
  lon: number;
  polygon?: Ring;
}

export function rememberLiveRequest(id: string, request: LiveRequest): void {
  try {
    window.localStorage.setItem(KEY(id), JSON.stringify(request));
  } catch {
    // sin almacenamiento: se usará el centro del id
  }
}

export function recallLiveRequest(id: string): LiveRequest | null {
  try {
    const raw = window.localStorage.getItem(KEY(id));
    return raw ? (JSON.parse(raw) as LiveRequest) : null;
  } catch {
    return null;
  }
}
