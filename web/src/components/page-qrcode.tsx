"use client";

import { useQRCode } from "next-qrcode";
//import { usePathname } from "next/navigation";
//import { useEffect, useState } from "react";

export const PageQrCode = ({ url }: { url?: string }) => {
	const href = url || window.location.href;
	/*
	const pathname = usePathname();
	const [href, setHref] = useState<string>("");

	useEffect(() => {
		setHref(window.location.href);
	}, []);
	*/
	//console.log(href);
	const { SVG } = useQRCode();

	return (
		<>
			<SVG
				text={`${href}`}
				options={{
					margin: 2,
					width: 200,
					color: {
						//dark: '#010599FF',
						//light: '',
					},
				}}
			/>
		</>
	);
};
