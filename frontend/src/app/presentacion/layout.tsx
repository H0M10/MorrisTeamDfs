import type { ReactNode } from "react";
import { MissionShell } from "../_components/MissionShell";
export default function Layout({ children }: { children: ReactNode }) {
  return <MissionShell>{children}</MissionShell>;
}
