"use client";

import { toastError } from "@/components/toaster";
import { Loader } from "@/components/loader";
import { getHostname } from "@/utils/utils";
import type { Store } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import logger from "@/lib/logger";

export default function GlobalHomePage() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const router = useRouter();
	const routeToStore = async () => {
		const host = getHostname();
		if (host !== null) {
			const url = `${process.env.NEXT_PUBLIC_API_URL}/store/get-by-hostname`;
			const body = JSON.stringify({
				customDomain: host,
			});

			await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: body,
			})
				.then((response) => response.json())
				.then((data) => {
					//console.log(data.length===0);
					//console.log('featch result: ' + JSON.stringify(data));
					let url = "/unv"; // the default built-in path if no store found

					if (data.length !== 0) {
						//if pending order, move on to payment
						const stores = data as Store[];
						//console.log('featch result: ' + JSON.stringify(stores));
						//console.log('store.id: ' + stores[0].id);

						const storeId = stores[0].id;
						if (storeId) {
							url = `./s/${storeId}`;
						}
					}

					router.push(url);
				})
				.catch((error) => {
					logger.error("Operation log", {
						metadata: {
							error: error instanceof Error ? error.message : String(error),
						},
						tags: ["error"],
					});
					toastError(error.message);
					throw new Error("Something went wrong.");
				});
		}
	};

	if (!mounted) return <></>;

	routeToStore();

	return <Loader />;
}
