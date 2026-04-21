import Link from "next/link";

import Container from "@/components/ui/container";
import { Heading } from "@/components/heading";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

type Params = Promise<{ storeId: string }>;

export default async function StoreOrdersPage(props: { params: Params }) {
	const params = await props.params;

	const orders = await sqlClient.storeOrder.findMany({
		where: { storeId: params.storeId },
		orderBy: { createdAt: "desc" },
		take: 100,
		select: {
			id: true,
			orderNum: true,
			orderTotal: true,
			orderStatus: true,
			paymentStatus: true,
			isPaid: true,
			createdAt: true,
		},
	});

	transformPrismaDataForJson(orders);

	const storeId = params.storeId;

	return (
		<Container>
			<Heading title="Orders" badge={orders.length} />
			<Separator className="my-4" />
			<div className="rounded-md border overflow-hidden">
				<div className="overflow-x-auto -mx-3 sm:mx-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Order</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Paid</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map((o) => (
								<TableRow key={o.id}>
									<TableCell>
										<Link
											className="font-mono text-primary underline-offset-4 hover:underline"
											href={`/storeAdmin/${storeId}/order/${o.id}`}
										>
											#{o.orderNum ?? o.id.slice(0, 8)}
										</Link>
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(epochToDate(o.createdAt) ?? undefined)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{String(o.orderTotal)}
									</TableCell>
									<TableCell>{o.orderStatus}</TableCell>
									<TableCell>{o.isPaid ? "Yes" : "No"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</Container>
	);
}
