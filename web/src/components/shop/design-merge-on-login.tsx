"use client";

import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { dedupeSavedDesignsByProduct } from "@/hooks/use-saved-designs";

/**
 * When a session appears, collapse duplicate saved designs per product (local only).
 */
export function DesignMergeOnLogin() {
	const { data: session } = authClient.useSession();
	const prevUserId = useRef<string | undefined>(undefined);

	useEffect(() => {
		const uid = session?.user?.id;
		if (uid && uid !== prevUserId.current) {
			dedupeSavedDesignsByProduct();
			prevUserId.current = uid;
		}
		if (!uid) {
			prevUserId.current = undefined;
		}
	}, [session?.user?.id]);

	return null;
}
