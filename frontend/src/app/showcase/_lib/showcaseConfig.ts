export interface ShowcaseLayer {
  id: string;
  name: string;
  nativeScale: string;
  source: string;
  description: string;
  cameraDistance: number;
}

export interface ShowcaseClip {
  id: string;
  fileName: string;
  posterFileName: string;
  title: string;
  description: string;
}

export const SHOWCASE_CONFIG = {
  layers: [
    {
      id: "globe",
      name: "Globo",
      nativeScale: "Vista global; sin escala de observación",
      source: "Sin fuente de datos: referencia visual conceptual",
      description:
        "Vista conceptual, sin coordenadas ni límites de parcela. No es una capa cartográfica.",
      cameraDistance: 5,
    },
    {
      id: "power",
      name: "Contexto climático",
      nativeScale: "Aproximadamente 50 km",
      source: "NASA POWER",
      description:
        "Clima y evapotranspiración de referencia como contexto regional, no como medición de parcela.",
      cameraDistance: 4,
    },
    {
      id: "smap",
      name: "Humedad regional",
      nativeScale: "9 km",
      source: "NASA SMAP L4",
      description:
        "Humedad del suelo a escala regional; no representa la humedad de esta parcela.",
      cameraDistance: 3,
    },
    {
      id: "soilgrids",
      name: "Contexto de suelo",
      nativeScale: "250 m",
      source: "SoilGrids (ISRIC; no es una fuente NASA)",
      description:
        "Propiedades de suelo modeladas a escala de 250 m; no son una muestra del suelo de la parcela.",
      cameraDistance: 2,
    },
    {
      id: "field-detail",
      name: "Detalle satelital",
      nativeScale: "30 m",
      source: "HLS (Landsat / Sentinel-2) y SRTM; USDA CDL donde hay cobertura",
      description:
        "Resolución nativa de los productos. La vista actual no renderiza sus píxeles ni polígonos.",
      cameraDistance: 1.25,
    },
  ] satisfies ShowcaseLayer[],
  clips: [
    {
      id: "globe-to-parcel",
      fileName: "globe-to-parcel.webm",
      posterFileName: "globe-to-parcel.webp",
      title: "Del globo a la parcela",
      description:
        "Clip de apoyo pendiente. La futura animación no debe implicar coordenadas ni precisión que no estén en los datos.",
    },
    {
      id: "source-scales",
      fileName: "source-scales.webm",
      posterFileName: "source-scales.webp",
      title: "Escalas de las fuentes",
      description:
        "Clip de apoyo pendiente. Las escalas son resoluciones nativas y no mediciones de parcela.",
    },
  ] satisfies ShowcaseClip[],
} as const;
