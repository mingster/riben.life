import { getT } from "@/app/i18n";
import { Heading } from "@/components/heading";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { ClientPolicies } from "./components/client-policies";

type Params = Promise<{ storeId: string }>;

export default async function StorePoliciesPage(props: { params: Params }) {
	const params = await props.params;
	const { t } = await getT();

	const storeSettings = await sqlClient.storeSettings.findUnique({
		where: { storeId: params.storeId },
	});

	transformPrismaDataForJson(storeSettings);

	return (
		<Container>
			<Heading
				title={t("policies")}
				description={t("store_policies_page_descr")}
			/>
			<ClientPolicies initialSettings={storeSettings} />
		</Container>
	);
}
