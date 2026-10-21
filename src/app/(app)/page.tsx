import { HomeDashboard } from "@/components/home/HomeDashboard";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Início</h1>
      <HomeDashboard />
    </div>
  );
}
