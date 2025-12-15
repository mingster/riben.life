import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { checkAdminAccess } from "../admin-utils";
import { PaymentMethodClient } from "./components/client-payment-method";
import {
	mapPaymentMethodToColumn,
	type PaymentMethodColumn,
} from "./payment-method-column";

type Params = Promise<{ [key: string]: string | string[] | undefined }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function PaymentMethodAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	await props.params;
	checkAdminAccess();

	// Optimized query using _count instead of loading all related data
	const methods = await sqlClient.paymentMethod.findMany({
		include: {
			_count: {
				select: {
					StorePaymentMethodMapping: true,
					StoreOrder: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});

	transformPrismaDataForJson(methods);

	// Map methods to UI format
	const formattedData: PaymentMethodColumn[] = methods.map((item) =>
		mapPaymentMethodToColumn(item),
	);

	return (
		<Container>
			<PaymentMethodClient serverData={formattedData} />
		</Container>
	);
}
