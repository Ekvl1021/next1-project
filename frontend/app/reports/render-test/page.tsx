import { notFound } from "next/navigation";
import RenderBenchmark from "./RenderBenchmark";
export default function RenderTestPage() {
  if (process.env.NEXT_PUBLIC_LAB_MEASUREMENTS !== "1") notFound();
  return <RenderBenchmark />;
}
