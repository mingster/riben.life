import { StoreOrder } from "@/types";
import { DisplayOrder } from "./display-order";

type orderTabProps = { orders: StoreOrder[] };
export const DisplayOrders = ({ orders }: orderTabProps) => {
	return (
		<>
			<div className="flex-col">
				<div className="flex-1 p-1 space-y-1">
					{orders.map((order: StoreOrder) => (
						<div key={order.id}>
							<DisplayOrder order={order} />
						</div>
					))}
				</div>
			</div>
		</>
	);
};
