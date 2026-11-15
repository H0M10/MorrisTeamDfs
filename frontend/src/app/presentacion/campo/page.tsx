import { ImpactScale, ValleyProblem } from "../../_components/LandingSections";
import { PresentationLab } from "../../_components/PresentationLab";
export default function Page() {
  return (
    <>
      <h1 className="mission-route-title">Diamond Valley / Nevada</h1>
      <ValleyProblem />
      <ImpactScale />
      <PresentationLab view="decision" />
    </>
  );
}
