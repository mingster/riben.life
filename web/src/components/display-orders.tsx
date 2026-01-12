"use client";

import { StoreOrder } from "@/types";
import { DisplayOrder } from "./display-order";

type orderTabProps = { orders: StoreOrder[] };
export const DisplayOrders = ({ orders }: orderTabProps) => {
	//console.log(`orders: ${JSON.stringify(orders)}`);
	return (
		<>
			<div className="flex-col">
				<div className="flex-1 p-1 space-y-1">
					{orders.map((order: StoreOrder) => (
						<div key={order.id}>
							<DisplayOrder
								order={order}
								hidePaymentMethod={false}
								hideOrderStatus={false}
								hideContactSeller={false}
								showPickupCode={false}
							/>
						</div>
					))}
				</div>
			</div>
		</>
	);
};
