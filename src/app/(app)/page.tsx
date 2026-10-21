import { HomeDashboard } from "@/components/home/HomeDashboard";
import { StudyStatus } from "@/components/home/StudyStatus";
import { Welcome } from "@/components/home/Welcome";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Início</h1>
      <StudyStatus />
      <HomeDashboard />
      <Welcome />
    </div>
  );
}
