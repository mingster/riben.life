"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { upsertProductLocaleSchema } from "./upsert-product-locale.validation";

export const upsertProductLocaleAction = storeActionClient
	.metadata({ name: "upsertProductLocale" })
	.schema(upsertProductLocaleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { productId, localeId, name } = parsedInput;

		const product = await sqlClient.product.findFirst({
			where: { id: productId, storeId },
			select: { id: true },
		});
		if (!product) throw new SafeError("Product not found");

		const locale = await sqlClient.productLocale.upsert({
			where: { productId_localeId: { productId, localeId } },
			update: { name },
			create: { productId, localeId, name },
		});

		return locale;
	});
