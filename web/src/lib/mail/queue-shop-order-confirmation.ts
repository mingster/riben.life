import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { StringNVType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { loadOuterHtmTemplate } from "@/actions/mail/load-outer-htm-template";
import { phasePlaintextToHtm } from "@/actions/mail/phase-plaintext-to-htm";

function parseCheckoutAttrs(raw: string): Record<string, unknown> {
	try {
		const v: unknown = JSON.parse(raw || "{}");
		return typeof v === "object" && v !== null && !Array.isArray(v)
			? (v as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

/**
 * Queues a customer order confirmation email once per order (idempotent via checkoutAttributes flag).
 */
export async function queueShopOrderConfirmationEmail(
	orderId: string,
): Promise<void> {
	const order = await sqlClient.storeOrder.findUnique({
		where: { id: orderId },
		include: {
			User: { select: { email: true, name: true } },
			OrderItems: true,
			ShippingMethod: { select: { name: true } },
		},
	});

	if (!order?.User?.email) {
		logger.warn("queueShopOrderConfirmationEmail: no customer email", {
			metadata: { orderId },
			tags: ["mail", "shop-order", "skip"],
		});
		return;
	}

	const attrs = parseCheckoutAttrs(order.checkoutAttributes ?? "");
	if (attrs.confirmationEmailQueued === true) {
		return;
	}

	const setting = await sqlClient.platformSettings.findFirst();
	const supportEmail = "support@riben.life";
	let fromName = "riben.life";
	if (setting?.settings) {
		try {
			const settingsKV = JSON.parse(
				setting.settings as string,
			) as StringNVType[];
			const found = settingsKV.find((item) => item.label === "Support.Email");
			if (found?.value) {
				fromName = found.value;
			}
		} catch {
			// ignore
		}
	}

	const lines = order.OrderItems.map(
		(i) => `• ${i.productName} × ${i.quantity} @ ${Number(i.unitPrice)}`,
	);
	const subject = `Order confirmation — ${order.id.slice(0, 8)}`;
	const textMessage = [
		`Hi ${order.User.name ?? ""},`,
		"",
		"Thank you for your order.",
		"",
		`Order: ${order.id}`,
		`Total: ${order.currency.toUpperCase()} ${Number(order.orderTotal)}`,
		order.ShippingMethod ? `Shipping: ${order.ShippingMethod.name}` : null,
		"",
		"Items:",
		...lines,
		"",
		"We will notify you when your order ships.",
	]
		.filter(Boolean)
		.join("\n");

	let htmMessage: string;
	try {
		const template = await loadOuterHtmTemplate();
		if (template.length > 0) {
			htmMessage = template.replace(
				"{{message}}",
				phasePlaintextToHtm(textMessage),
			);
			htmMessage = htmMessage.replace(/{{subject}}/g, subject);
			htmMessage = htmMessage.replace(/{{footer}}/g, "");
		} else {
			htmMessage = `<pre>${textMessage.replace(/</g, "&lt;")}</pre>`;
		}
	} catch (err: unknown) {
		logger.warn("queueShopOrderConfirmationEmail: HTML template fallback", {
			metadata: {
				orderId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["mail", "shop-order"],
		});
		htmMessage = `<pre>${textMessage.replace(/</g, "&lt;")}</pre>`;
	}

	await sqlClient.emailQueue.create({
		data: {
			from: supportEmail,
			fromName,
			to: order.User.email,
			toName: order.User.name ?? "",
			cc: "",
			bcc: "",
			subject,
			textMessage,
			htmMessage,
			createdOn: getUtcNowEpoch(),
			sendTries: 0,
			storeId: order.storeId,
			priority: 5,
		},
	});

	const nextAttrs = {
		...attrs,
		confirmationEmailQueued: true,
	};
	await sqlClient.storeOrder.update({
		where: { id: orderId },
		data: {
			checkoutAttributes: JSON.stringify(nextAttrs),
			updatedAt: getUtcNowEpoch(),
		},
	});
}
