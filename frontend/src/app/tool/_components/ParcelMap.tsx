// "use client";
// import { useEffect, useRef } from "react";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import type { Evaluation } from "@/lib/contract";
// import { useI18n } from "@/lib/i18n";

// type ParcelData = Evaluation["parcel"];

// export function ParcelMap({ parcel }: { parcel: ParcelData }) {
//   const mapContainer = useRef<HTMLDivElement>(null);
//   const mapInstanceRef = useRef<L.Map | null>(null);
//   const layerGroupRef = useRef<L.LayerGroup | null>(null);
//   const { pick } = useI18n();

//   useEffect(() => {
//     if (!mapContainer.current) return;

//     // 1. Inicializar el mapa solo una vez
//     if (!mapInstanceRef.current) {
//       const map = L.map(mapContainer.current).setView([20.5888, -100.3899], 14);
//       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//         maxZoom: 19,
//         attribution: '© OpenStreetMap contributors',
//       }).addTo(map);

//       mapInstanceRef.current = map;
//       layerGroupRef.current = L.layerGroup().addTo(map);
//     }
//   }, []);

//   // 2. Actualizar polígono, centrado y forzar redibujado al cambiar de parcela
//   useEffect(() => {
//     const map = mapInstanceRef.current;
//     const layerGroup = layerGroupRef.current;
//     if (!map || !layerGroup) return;

//     // CLAVE: Forzar a Leaflet a recalcular dimensiones y refrescarse al cambiar de opción
//     setTimeout(() => {
//       map.invalidateSize();
//     }, 100);

//     // Limpiar capas anteriores
//     layerGroup.clearLayers();

//     if (parcel.polygon_wgs84 && Array.isArray(parcel.polygon_wgs84) && parcel.polygon_wgs84.length > 0) {
//       try {
//         const latLngs = parcel.polygon_wgs84.map((pt: number[]) => [pt[1], pt[0]] as [number, number]);
//         const polygonLayer = L.polygon(latLngs, {
//           color: "#1247B8",
//           weight: 3,
//           fillColor: "#1247B8",
//           fillOpacity: 0.35,
//         });

//         layerGroup.addLayer(polygonLayer);

//         // Ajustar el zoom y centrado automáticamente al polígono de la parcela seleccionada
//         const bounds = polygonLayer.getBounds();
//         if (bounds.isValid()) {
//           map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
//         }
//       } catch (e) {
//         console.error("Error al renderizar polygon_wgs84 en Leaflet:", e);
//       }
//     } else if (parcel.center && typeof parcel.center.lat === "number" && typeof parcel.center.lon === "number") {
//       map.setView([parcel.center.lat, parcel.center.lon], 14);
//     }
//   }, [parcel]);

//   // Limpiar instancia al desmontar
//   useEffect(() => {
//     return () => {
//       if (mapInstanceRef.current) {
//         mapInstanceRef.current.remove();
//         mapInstanceRef.current = null;
//       }
//     };
//   }, []);

//   const footprints = parcel.native_pixel_footprints_m
//     ? Object.entries(parcel.native_pixel_footprints_m)
//     : [];

//   return (
//     <section aria-labelledby="map-heading" style={{ margin: "1.5rem 0" }}>
//       <h2 id="map-heading">Mapa de la parcela: {pick(parcel.name)}</h2>
//       <div
//         ref={mapContainer}
//         role="img"
//         aria-label={`Mapa interactivo mostrando los límites de ${pick(parcel.name)}`}
//         style={{
//           width: "100%",
//           height: "380px",
//           border: "2px solid #000000",
//           borderRadius: "4px",
//           zIndex: 1,
//         }}
//       />
//       <div style={{ marginTop: "1rem" }}>
//         <h3>Escala real de píxel por fuente de datos</h3>
//         {footprints.length > 0 ? (
//           <dl className="facts">
//             {footprints.map(([source, meters]) => (
//               <div key={source} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
//                 <dt style={{ fontWeight: "bold" }}>{source.replaceAll("_", " ")}:</dt>
//                 <dd style={{ margin: 0 }}>{String(meters)} metros por píxel</dd>
//               </div>
//             ))}
//           </dl>
//         ) : (
//           <p>Información de resolución espacial no disponible para esta parcela.</p>
//         )}
//       </div>
//     </section>
//   );
// }
"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Evaluation } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

type ParcelData = Evaluation["parcel"];

export function ParcelMap({ parcel }: { parcel: ParcelData }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { pick } = useI18n();

  useEffect(() => {
    if (!mapContainer.current) return;

    // Coordenadas por defecto (Querétaro) por si no hay centro
    const defaultCenter: [number, number] = [20.5888, -100.3899];
    const initialCenter =
      parcel.center && typeof parcel.center.lat === "number" && typeof parcel.center.lon === "number"
        ? [parcel.center.lat, parcel.center.lon] as [number, number]
        : defaultCenter;

    // Crear la instancia del mapa limpia
    const map = L.map(mapContainer.current).setView(initialCenter, 14);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    // Dibujar el polígono de la parcela
    if (parcel.polygon_wgs84 && Array.isArray(parcel.polygon_wgs84) && parcel.polygon_wgs84.length > 0) {
      try {
        const latLngs = parcel.polygon_wgs84.map((pt: number[]) => [pt[1], pt[0]] as [number, number]);
        const polygonLayer = L.polygon(latLngs, {
          color: "#1247B8",
          weight: 3,
          fillColor: "#1247B8",
          fillOpacity: 0.35,
        });

        layerGroup.addLayer(polygonLayer);

        const bounds = polygonLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } catch (e) {
        console.error("Error al renderizar el polígono en Leaflet:", e);
      }
    }

    // Limpieza al desmontar el componente
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [parcel]);

  const footprints = parcel.native_pixel_footprints_m
    ? Object.entries(parcel.native_pixel_footprints_m)
    : [];

  return (
    <section aria-labelledby="map-heading" style={{ margin: "1.5rem 0" }}>
      <h2 id="map-heading">Mapa de la parcela: {pick(parcel.name)}</h2>
      <div
        ref={mapContainer}
        role="img"
        aria-label={`Mapa interactivo mostrando los límites de ${pick(parcel.name)}`}
        style={{
          width: "100%",
          height: "380px",
          border: "2px solid #000000",
          borderRadius: "4px",
          zIndex: 1,
        }}
      />
      <div style={{ marginTop: "1rem" }}>
        <h3>Escala real de píxel por fuente de datos</h3>
        {footprints.length > 0 ? (
          <dl className="facts">
            {footprints.map(([source, meters]) => (
              <div key={source} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <dt style={{ fontWeight: "bold" }}>{source.replaceAll("_", " ")}:</dt>
                <dd style={{ margin: 0 }}>{String(meters)} metros por píxel</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>Información de resolución espacial no disponible para esta parcela.</p>
        )}
      </div>
    </section>
  );
}