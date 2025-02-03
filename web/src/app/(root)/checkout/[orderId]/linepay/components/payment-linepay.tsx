"use client";
import { Button } from "@/components/ui/button";
import { createLinePayClient } from "@/lib/linepay";
import type { LinePayClient } from "@/lib/linepay/type";
import { getAbsoluteUrl } from "@/lib/utils";
import type { StoreOrder } from "@/types";
import { useQRCode } from "next-qrcode";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type paymentProps = {
	order: StoreOrder;
	webUrl: string;
	appUrl: string;
};
const PaymentLinePay: React.FC<paymentProps> = ({ order, webUrl, appUrl }) => {
	if (!order) throw Error("order is required.");
	const { SVG } = useQRCode();

	console.log("appUrl", appUrl);

	return (
		<div>
			<div className="text-xl font-extrabold">
				請在LINE程序掃描二維碼完成付款
			</div>
			<div>
				<SVG
					text={appUrl}
					options={{
						margin: 2,
						width: 200,
					}}
				/>
			</div>

			<div className="pt-10 text-xl font-extrabold">或點擊下方按鈕完成付款</div>
			<div>
				<Button variant={"secondary"} onClick={() => window.open(webUrl)}>
					付款
				</Button>
			</div>
		</div>
	);
};

export default PaymentLinePay;
