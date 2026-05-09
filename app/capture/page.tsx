import { Suspense } from "react";

import { CaptureView } from "@/components/capture/capture-view";

export default function CapturePage() {
  return (
    <Suspense fallback={null}>
      <CaptureView />
    </Suspense>
  );
}
