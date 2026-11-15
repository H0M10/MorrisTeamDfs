import { redirect } from "next/navigation";

// El flujo sencillo de prueba se retiró (no gustó: perdía el mapa y las
// restricciones configurables). Los enlaces viejos llegan a la herramienta.
export default function CampoPage() {
  redirect("/tool");
}
