import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import Container from "@/components/ui/container";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { transformPrismaDataForJson } from "@/utils/utils";
import { IconCircleCheck } from "@tabler/icons-react";

type Params = Promise<{ storeId: string; orderId: string }>;

/**
 * Success page after credit recharge payment.
 */
export default async function RechargeSuccessPage(props: { params: Params }) {
	const params = await props.params;

	const order = await sqlClient.storeOrder.findUnique({
		where: { id: params.orderId },
		include: {
			Store: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	if (!order) {
		redirect(`/${params.storeId}`);
	}

	transformPrismaDataForJson(order);

	return (
		<Container>
			<Card className="max-w-2xl mx-auto">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<IconCircleCheck className="h-16 w-16 text-green-500" />
					</div>
					<CardTitle className="text-2xl">Payment Successful!</CardTitle>
					<CardDescription>
						Your credit recharge has been processed successfully.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Order Number</p>
						<p className="font-mono">{order.orderNum || order.id}</p>
					</div>
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Amount</p>
						<p className="text-lg font-semibold">
							{Number(order.orderTotal)} {order.currency.toUpperCase()}
						</p>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 pt-4">
						<Button asChild className="flex-1 h-10 sm:h-9">
							<Link href={`/${params.storeId}`}>Back to Store</Link>
						</Button>
						<Button asChild variant="outline" className="flex-1 h-10 sm:h-9">
							<Link href="/account/subscription?tab=credits">
								View Credit Balance
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</Container>
	);
}
