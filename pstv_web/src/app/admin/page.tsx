import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";
import { AdminMockupContent } from "./components/admin-mockup-content";
//
//
export default async function AdminPage() {
  return (
    <Suspense fallback={<Loader />}>
      <AdminMockupContent />
    </Suspense>
  );
}
