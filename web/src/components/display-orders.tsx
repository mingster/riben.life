"use client";

import type { ManageProfileOrderRow } from "@/actions/storeAdmin/storeAdmin/get-store-customer-profile-for-manage";
import type { StoreOrder } from "@/types";
import type { CurrentUserOrdersList } from "@/types/current-user";
import { DisplayOrder } from "./display-order";

type orderTabProps = {
	orders: StoreOrder[] | ManageProfileOrderRow[] | CurrentUserOrdersList;
};
export const DisplayOrders = ({ orders }: orderTabProps) => {
	//console.log(`orders: ${JSON.stringify(orders)}`);
	return (
		<>
			<div className="flex-col">
				<div className="flex-1 p-1 space-y-1">
					{orders.map((order) => (
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
