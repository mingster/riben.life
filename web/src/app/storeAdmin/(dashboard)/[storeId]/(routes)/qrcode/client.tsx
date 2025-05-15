"use client";

import { getAbsoluteUrl } from "@/utils/utils";
import type { Store } from "@/types";
import type { StoreTables } from "@prisma/client";
import { useQRCode } from "next-qrcode";

import Link from "next/link";
export interface props {
	store: Store;
	tables: StoreTables[];
}
export const QrCodeClient: React.FC<props> = ({ store, tables }) => {
	const { Image } = useQRCode();

	//console.log("domain", store.customDomain);

	let takeoffUrl = "";
	if (store.customDomain) {
		const port =
			typeof window !== "undefined" && window.location.port
				? window.location.port
				: "";

		const protocol =
			typeof window !== "undefined" && window.location.protocol
				? `${window.location.protocol}//`
				: "http://";

		takeoffUrl = protocol + store.customDomain;
		if (port) takeoffUrl = `${takeoffUrl}:${port}`;

		takeoffUrl = `${takeoffUrl}/${store.id}`;
	} else {
		takeoffUrl = `${getAbsoluteUrl()}/${store.id}`;
	}

	if (store.customDomain) {
		return (
			<div className="pl-5">
				<h1>外帶</h1>

				<Link title={takeoffUrl} href={takeoffUrl}>
					<Image
						text={takeoffUrl}
						options={{
							type: "image/jpeg",
							quality: 1,
							errorCorrectionLevel: "high",
							margin: 2,
							scale: 1,
							width: 200,
							color: {},
						}}
					/>
				</Link>

				<h1 className="pt-10">內用</h1>
				<div className="grid grid-cols-5 gap-2">
					{tables.map((table) => (
						<div key={table.id}>
							<h2>
								{table.tableName}
								<Link
									title={`${takeoffUrl}/${table.id}`}
									href={`${takeoffUrl}/${table.id}`}
								>
									<Image
										text={`${takeoffUrl}/${table.id}`}
										options={{
											type: "image/jpeg",
											quality: 1,
											errorCorrectionLevel: "high",
											margin: 2,
											scale: 1,
											width: 200,
											color: {},
										}}
									/>
								</Link>
							</h2>
						</div>
					))}
				</div>
			</div>
		);
	}
};
