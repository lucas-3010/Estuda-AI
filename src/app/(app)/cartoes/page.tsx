import { Suspense } from "react";
import { CardsManager } from "@/components/cards/CardsManager";

export default function CardsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Cartões</h1>
      <Suspense fallback={null}>
        <CardsManager />
      </Suspense>
    </div>
  );
}
