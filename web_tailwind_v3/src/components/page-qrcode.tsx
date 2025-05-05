import { useQRCode } from "next-qrcode";
import { useUrl } from "nextjs-current-url";

export const PageQrCode = () => {
	const { pathname, href } = useUrl() ?? {};
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
