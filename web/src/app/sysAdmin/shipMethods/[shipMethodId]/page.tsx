import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { EditClient } from "./edit-form-client";

const StoreEditPage = async (props: {
	params: Promise<{ shipMethodId: string }>;
}) => {
	const params = await props.params;
	if (params.shipMethodId === null) return;

	const obj = await sqlClient.shippingMethod.findUnique({
		where: {
			id: params.shipMethodId,
		},
	});
	transformPrismaDataForJson(obj);
	//console.log('paymentMethod', JSON.stringify(obj));

	//await sqlClient.storeShipMethodMapping.deleteMany({ where: {methodId: obj.id } });

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<h1 className="text-2xl xs:text-xl">Shipping Method</h1>
				<EditClient initialData={obj} />
			</div>
		</div>
	);
};

export default StoreEditPage;
