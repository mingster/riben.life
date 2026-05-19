"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteProductLocaleSchema } from "./delete-product-locale.validation";

export const deleteProductLocaleAction = storeActionClient
	.metadata({ name: "deleteProductLocale" })
	.schema(deleteProductLocaleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		const locale = await sqlClient.productLocale.findFirst({
			where: { id },
			select: { id: true, productId: true },
		});
		if (!locale) throw new SafeError("Locale not found");

		const product = await sqlClient.product.findFirst({
			where: { id: locale.productId, storeId },
			select: { id: true },
		});
		if (!product) throw new SafeError("Product not found");

		await sqlClient.productLocale.delete({ where: { id } });
		return { id };
	});
