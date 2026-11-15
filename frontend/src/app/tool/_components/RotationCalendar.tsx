"use client";
import type { Evaluation } from "@/lib/contract";
import { useI18n } from "@/lib/i18n";

type Strategy = Evaluation["strategies"][number];
const getMonthStatus = (monthIndex:number)=>{
  if([0,1,11].includes(monthIndex)){
    return {label:"Descanso Invernal", bg:"#e0f7fa", color:"#666"};
  }
  return {label:"Cultivo Activo", bg:"#e6f0fa",color:"#1247B8"}
}
export function RotationCalendar({ strategy }: { strategy: Strategy }) {
  const { pick } = useI18n();

  // Ejemplo de meses o periodos del calendario agrícola asociados a la estrategia
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];

  return (
    <div style={{ marginTop: "1rem", border: "1px solid #ddd", padding: "1rem", borderRadius: "4px" }}>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
        Calendario para: {pick(strategy.title)}
      </h3>
      <div 
        role="grid" 
        aria-label={`Calendario de cultivo para ${pick(strategy.title)}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "0.5rem",
          marginTop: "0.75rem"
        }}
      >
        {months.map((month, index) => {
          const status = getMonthStatus(index);
          return(
            <div 
              key={month}
              role="gridcell"
              style={{
                padding: "0.5rem",
                textAlign: "center",
                background: status.bg,
                border: "1px solid #ccc",
                borderRadius: "4px",
                minHeight: "44px" // Cumple con el requisito de área táctil accesible
              }}
            >
              <span style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold" }}>{month}</span>
              <span style={{ fontSize: "0.75rem", color: "#555" }}>{status.label}</span>
            </div>
          );
        }
          
        )}
      </div>
    </div>
  );
}