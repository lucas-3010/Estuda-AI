import { Suspense } from "react";
import { ReviewLoader } from "@/components/review/ReviewLoader";

export default function ReviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Revisar</h1>
      <Suspense fallback={null}>
        <ReviewLoader />
      </Suspense>
    </div>
  );
}
