import type { Prisma } from "@prisma/client";

import { parseProductSpecsJsonText } from "@/lib/parse-product-specs-json";
import { SafeError } from "@/utils/error";

export function resolveSpecsJsonForWrite(
	specsJsonText: string | undefined,
): Prisma.InputJsonValue | null | undefined {
	if (specsJsonText === undefined) {
		return undefined;
	}
	try {
		const parsed = parseProductSpecsJsonText(specsJsonText);
		if (parsed === undefined) {
			return undefined;
		}
		if (parsed === null) {
			return null;
		}
		return parsed as Prisma.InputJsonValue;
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		throw new SafeError(message);
	}
}
