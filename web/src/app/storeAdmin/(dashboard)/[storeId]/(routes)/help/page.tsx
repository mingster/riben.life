

import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";
import { FaqClient } from "./faq-client";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;


export default async function HelpPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const orderId = params.orderId;
  const query = searchParams.query;

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <FaqClient/>

      </Container>
    </Suspense>
  );
}
