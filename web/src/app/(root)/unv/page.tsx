import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";
import { UniversalHomeContent } from "./components/universal-home-content";

export default function GlobalHome() {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <UniversalHomeContent />
      </Suspense>
    </>
  );
}
