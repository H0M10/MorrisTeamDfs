import { FarmerAdoption, FarmerFriendly } from "../../_components/LandingSections";
import { PeopleChapter } from "../../_components/MissionChapters";
export default function Page() {
  return (
    <>
      <h1 className="mission-route-title">Field Shift / People</h1>
      <FarmerAdoption />
      <FarmerFriendly />
      <PeopleChapter />
    </>
  );
}
