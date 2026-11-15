import { notFound } from "next/navigation";
import { PresentationLab } from "../../../_components/PresentationLab";
export function generateStaticParams() {
  return ["1", "2", "3", "4", "5", "physics"].map((model) => ({ model }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const { model } = await params;
  if (!["1", "2", "3", "4", "5", "physics"].includes(model)) notFound();
  return (
    <>
      <h1 className="mission-route-title">
        Field Shift / {model === "physics" ? "FAO-56" : `Model ${model}`}
      </h1>
      <PresentationLab view="models" model={model} />
    </>
  );
}
