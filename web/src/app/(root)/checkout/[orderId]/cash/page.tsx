import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Suspense } from "react";
import { getT } from "@/app/i18n";
import { DisplayOrder } from "@/components/display-order";
import getOrderById from "@/actions/get-order-by_id";
import { StoreOrder } from "@/types";

/*
const CashPaymentPage = async (props: { params: Promise<{ orderId: string }> }) => {
  const params = await props.params;
  //console.log('orderId: ' + params.orderId);

  if (!params.orderId) {
    throw new Error("order Id is missing");
  }

  const order = (await getOrderById(params.orderId)) as StoreOrder;
  //console.log('order: ' + JSON.stringify(order));

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <SuccessAndRedirect orderId={order.id} />
      </Container>
    </Suspense>
  );
};
export default CashPaymentPage;
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
	const _query = searchParams.query;

	const { t } = await getT();

	const order = await getOrderById(orderId);

	if (!order) {
		return <div>Order not found</div>;
	}

	return (
		<Suspense fallback={<Loader />}>
			<div className="container relative pb-10">
				<section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
					<h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
						{t("cash_payment_instruction")}
					</h2>

					<DisplayOrder order={order as StoreOrder} />
				</section>
				<div className="relative flex w-full justify-center"> </div>
			</div>
		</Suspense>
	);
}
