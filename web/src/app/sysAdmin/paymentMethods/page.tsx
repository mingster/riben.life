import Container from "@/components/ui/container";
import "@/lib/payment/plugins";
import { listRegisteredPlugins } from "@/lib/payment/plugins/loader";
import { isPluginRegistered } from "@/lib/payment/plugins/utils";
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

	const registeredPluginIdentifiers = listRegisteredPlugins().map(
		(p) => p.identifier,
	);
	const dbPayUrls = new Set(
		methods.map((m) => (m.payUrl ?? "").trim().toLowerCase()).filter(Boolean),
	);
	const pluginsWithoutCatalogRow = registeredPluginIdentifiers.filter(
		(id) => !dbPayUrls.has(id.trim().toLowerCase()),
	);
	const catalogRowsMissingPluginCode = methods
		.filter((m) => {
			const p = (m.payUrl ?? "").trim().toLowerCase();
			return p !== "" && !isPluginRegistered(p);
		})
		.map((m) => `${m.name} (${m.payUrl})`);

	return (
		<Container>
			<PaymentMethodClient
				serverData={formattedData}
				registeredPluginIdentifiers={registeredPluginIdentifiers}
				pluginsWithoutCatalogRow={pluginsWithoutCatalogRow}
				catalogRowsMissingPluginCode={catalogRowsMissingPluginCode}
			/>
		</Container>
	);
}
