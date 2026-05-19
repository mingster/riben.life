"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { upsertProductLocalesSchema } from "./upsert-product-locales.validation";

export const upsertProductLocalesAction = storeActionClient
	.metadata({ name: "upsertProductLocales" })
	.schema(upsertProductLocalesSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { productId, locales } = parsedInput;

		const [product, store] = await Promise.all([
			sqlClient.product.findFirst({
				where: { id: productId, storeId },
				select: { id: true, name: true },
			}),
			sqlClient.store.findUnique({
				where: { id: storeId },
				select: { defaultLocale: true },
			}),
		]);
		if (!product) throw new SafeError("Product not found");

		const defaultLocaleLng = store?.defaultLocale ?? "tw";
		const defaultLocale = await sqlClient.locale.findFirst({
			where: { lng: defaultLocaleLng },
			select: { id: true },
		});
		const defaultLocaleId = defaultLocale?.id;

		const toUpsert = Object.entries(locales).filter(
			([_, val]) => val.trim() !== "",
		);
		const toDelete = Object.entries(locales)
			.filter(([_, val]) => val.trim() === "")
			.map(([localeId]) => localeId);

		if (toDelete.length > 0) {
			await sqlClient.productLocale.deleteMany({
				where: { productId, localeId: { in: toDelete } },
			});
		}

		for (const [localeId, name] of toUpsert) {
			await sqlClient.productLocale.upsert({
				where: { productId_localeId: { productId, localeId } },
				update: { name },
				create: { productId, localeId, name },
			});
		}

		let productName = product.name ?? "";
		if (defaultLocaleId && locales[defaultLocaleId] !== undefined) {
			const newName = locales[defaultLocaleId].trim();
			if (newName !== "" && newName !== productName) {
				await sqlClient.product.update({
					where: { id: productId },
					data: { name: newName },
				});
				productName = newName;
			}
		}

		const result = await sqlClient.productLocale.findMany({
			where: { productId },
		});

		return {
			locales: result.map((l) => ({
				id: l.id,
				localeId: l.localeId,
				name: l.name,
			})),
			productName,
		};
	});
