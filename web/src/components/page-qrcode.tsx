"use client";

import { useQRCode } from "next-qrcode";
import { useEffect, useState } from "react";

export const PageQrCode = () => {
	const [href, setHref] = useState<string>("");

	useEffect(() => {
		setHref(window.location.href);
	}, []);

	const { SVG } = useQRCode();

	// Avoid hydration/runtime errors from next-qrcode when text is empty.
	if (!href) {
		return null;
	}

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
