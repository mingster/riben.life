import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { mongoClient, sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
interface pageProps {
  params: {
    storeId: string;
  };
}
const StorePrivacyPage: React.FC<pageProps> = async ({ params }) => {
  const store = await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
  });

  if (!store) {
    redirect("/unv");
  }
  transformDecimalsToNumbers(store);

  const storeSettings = await mongoClient.storeSettings.findFirst({
    where: {
      databaseId: params.storeId,
    },
  });

  if (storeSettings === null) return;
  if (storeSettings.privacyPolicy === null) return;

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <section className="mx-auto flex flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
          <div className="max-w-[750px]">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkHtml]}>
              {storeSettings.privacyPolicy}
            </ReactMarkdown>
          </div>
        </section>
      </Container>
    </Suspense>
  );
};
export default StorePrivacyPage;
