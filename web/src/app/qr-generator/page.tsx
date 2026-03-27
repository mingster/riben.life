import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { QRGeneratorClient } from "./components/qr-generator-client";

export const metadata = {
	title: "QR Code Generator | Create Custom QR Codes",
	description:
		"Free online QR code generator. Create custom QR codes for URLs with advanced styling options including colors, sizes, and error correction levels.",
};

export default function QRGeneratorPage() {
	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<div className="py-8">
					<QRGeneratorClient />
				</div>
			</Container>
		</Suspense>
	);
}
