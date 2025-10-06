import { Suspense } from "react";
import { ClientGeoIP } from "@/app/sysAdmin/geo-ip/client-geo-ip";
import { Loader } from "@/components/loader";

export default function GeoIPPage() {
	return (
		<div className="min-h-screen bg-background">
			<Suspense fallback={<Loader />}>
				<ClientGeoIP />
			</Suspense>
		</div>
	);
}
