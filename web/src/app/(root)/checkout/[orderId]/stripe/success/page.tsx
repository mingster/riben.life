import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";

/*
interface pageProps {
  params: {
    storeId: string;
    orderId: string;
  };
}

const CheckoutSuccessPage: React.FC<pageProps> = props => {
  const params = use(props.params);
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <SuccessAndRedirect orderId={params.orderId} />
      </Container>
    </Suspense>
  );
};
export default CheckoutSuccessPage;
*/

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CashPaymentPage(props: {
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
        <SuccessAndRedirect orderId={orderId} />
      </Container>
    </Suspense>
  );
}
