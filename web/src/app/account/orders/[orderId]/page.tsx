import { format } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getT } from "@/app/i18n";
import getCurrentUser from "@/actions/user/get-current-user";
import Currency from "@/components/currency";
import { GlobalNavbar } from "@/components/global-navbar";
import { PageQrCode } from "@/components/page-qrcode";
import { sqlClient } from "@/lib/prismadb";

interface PageProps {
	params: Promise<{ orderId: string }>;
}

function formatEpoch(createdAt: bigint | number): string {
	const n = typeof createdAt === "bigint" ? Number(createdAt) : createdAt;
	if (!Number.isFinite(n)) {
		return "—";
	}
	return format(new Date(n), "PPpp");
}

export default async function AccountOrderDetailPage(props: PageProps) {
	const { orderId } = await props.params;
	const { t } = await getT();
	const user = await getCurrentUser();
	if (!user) {
		redirect(`/signIn?callbackUrl=/account/orders/${orderId}`);
	}

	const order = await sqlClient.storeOrder.findFirst({
		where: { id: orderId, userId: user.id },
		include: {
			OrderItemView: true,
			ShippingMethod: true,
			Store: { select: { name: true } },
		},
	});

	if (!order) {
		notFound();
	}

	let shipParsed: Record<string, string> | null = null;
	if (order.shippingAddress && order.shippingAddress.length > 0) {
		try {
			const v: unknown = JSON.parse(order.shippingAddress);
			shipParsed =
				typeof v === "object" && v !== null && !Array.isArray(v)
					? (v as Record<string, string>)
					: null;
		} catch {
			shipParsed = null;
		}
	}

	const isPickup =
		order.shopFulfillmentType === "pickup" || shipParsed?.type === "pickup";
	const pickupReadyAt =
		order.shopPickupReadyAt !== null && order.shopPickupReadyAt !== undefined
			? Number(order.shopPickupReadyAt)
			: null;

	return (
		<>
			<GlobalNavbar title={t("account_order_detail_title") || "Order detail"} />
			<div className="mx-auto max-w-2xl space-y-8 px-3 py-8 sm:px-4 lg:px-6">
				<Link
					href="/account?tab=orders"
					className="text-sm text-muted-foreground underline underline-offset-4"
				>
					← {t("account_orders_back_to_orders") || "Back to orders"}
				</Link>

				<div>
					<h1 className=" text-2xl font-light tracking-tight">
						{t("account_order_label") || "Order"}{" "}
						{order.orderNum ?? order.id.slice(0, 8)}
					</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						{formatEpoch(order.createdAt)} ·{" "}
						{order.Store?.name ??
							(t("account_order_store_fallback") || "Store")}
					</p>
					<p className="mt-2 text-sm">
						<span
							className={order.isPaid ? "text-green-600" : "text-amber-600"}
						>
							{order.isPaid
								? t("account_order_paid") || "Paid"
								: t("account_order_pending_payment") || "Pending payment"}
						</span>
						{" · "}
						<span className="font-medium">
							<Currency value={Number(order.orderTotal)} />
						</span>{" "}
						<span className="text-muted-foreground">
							({order.currency.toUpperCase()})
						</span>
					</p>
				</div>

				{isPickup && shipParsed ? (
					<section className="rounded-lg border border-border/80 bg-card/30 p-4 sm:p-5">
						<h2 className="text-sm font-medium">
							{t("account_order_click_collect") || "Click & collect"}
						</h2>
						<div className="mt-2 text-sm text-muted-foreground">
							<p className="font-medium text-foreground">{shipParsed.name}</p>
							<p className="mt-1">
								{shipParsed.streetLine1}
								<br />
								{shipParsed.city}
								{shipParsed.countryName ? `, ${shipParsed.countryName}` : ""}
							</p>
							{shipParsed.hours ? (
								<p className="mt-2 text-xs">{shipParsed.hours}</p>
							) : null}
							{pickupReadyAt ? (
								<p className="mt-3 text-sm font-medium text-green-600">
									{t("account_order_ready_for_pickup") || "Ready for pickup"} ·{" "}
									{formatEpoch(pickupReadyAt)}
								</p>
							) : (
								<p className="mt-3 text-sm text-amber-600">
									{t("account_order_ready_pickup_pending_notice") ||
										"We will notify you when your order is ready for pickup."}
								</p>
							)}
						</div>
					</section>
				) : null}

				{!isPickup && shipParsed && shipParsed.firstName ? (
					<section className="rounded-lg border border-border/80 bg-card/30 p-4 sm:p-5">
						<h2 className="text-sm font-medium">
							{t("account_order_shipping_address") || "Shipping address"}
						</h2>
						<address className="mt-2 text-sm not-italic text-muted-foreground">
							{shipParsed.firstName} {shipParsed.lastName}
							<br />
							{shipParsed.streetLine1}
							<br />
							{shipParsed.city}
							{shipParsed.province ? `, ${shipParsed.province}` : ""}{" "}
							{shipParsed.postalCode ?? ""}
							<br />
							{shipParsed.countryName ?? shipParsed.countryId}
							<br />
							{shipParsed.phoneNumber}
						</address>
					</section>
				) : null}

				{order.ShippingMethod ? (
					<p className="text-sm text-muted-foreground">
						{isPickup
							? t("account_order_fulfillment") || "Fulfillment"
							: t("shipping_method") || "Shipping method"}
						:{" "}
						<span className="text-foreground">
							{isPickup
								? t("account_order_click_collect") || "Click & collect"
								: order.ShippingMethod.name}
						</span>
						{!isPickup && Number(order.shippingCost) > 0 ? (
							<>
								{" "}
								· {t("account_order_shipping_cost_label") || "Shipping"}{" "}
								<Currency value={Number(order.shippingCost)} />
							</>
						) : null}
					</p>
				) : null}

				<section>
					<h2 className="mb-3 text-sm font-medium">{t("items") || "Items"}</h2>
					<ul className="divide-y divide-border rounded-lg border border-border/80">
						{order.OrderItemView.map((line) => (
							<li
								key={line.id}
								className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
							>
								<div>
									<p className="text-sm font-medium">{line.name}</p>
									{line.variants ? (
										<p className="text-xs text-muted-foreground">
											{line.variants}
										</p>
									) : null}
									<p className="text-xs text-muted-foreground">
										{t("account_order_qty_label") || "Qty"} {line.quantity}
									</p>
								</div>
								<div className="text-sm sm:text-right">
									<Currency value={Number(line.unitPrice) * line.quantity} />
								</div>
							</li>
						))}
					</ul>
				</section>

				<section className="rounded-lg border border-border/80 bg-card/30 p-4 sm:p-5">
					<h2 className="text-sm font-medium">
						{t("account_order_qr_title") || "Order QR code"}
					</h2>
					<p className="mt-2 text-xs text-muted-foreground">
						{t("account_order_qr_helper") ||
							"Please screenshot this QR code for quick access to this order page."}
					</p>
					<div className="mt-3 flex justify-center rounded-md bg-white p-3">
						<PageQrCode />
					</div>
				</section>
			</div>
		</>
	);
}
