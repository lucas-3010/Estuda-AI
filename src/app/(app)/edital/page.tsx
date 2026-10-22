import { Suspense } from "react";
import { EditalView } from "@/components/edital/EditalView";

export default function EditalPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Suspense fallback={null}>
        <EditalView />
      </Suspense>
    </div>
  );
}
