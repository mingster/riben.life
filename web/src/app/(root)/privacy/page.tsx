import { Suspense } from "react";
import { GetContentPrivacy } from "@/actions/store/get-content-privacy";
import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import DisplayMarkDown from "@/components/display-mark-down";
import Container from "@/components/ui/container";

// display privacy policy
//
export default async function PrivacyPage() {
	const PrivacyPolicy = await GetContentPrivacy();

	const { t } = await getT();
	const title = t("page_title_privacy");

	return (
		<Suspense fallback={<Loader />}>
			<div className="min-h-screen">
				<GlobalNavbar title={title} />
				<Container className="font-minimal pt-0 bg-[url('/img/noise.147fc0e.gif')] bg-repeat dark:bg-none">
					<div className="min-h-screen flex flex-col font-minimal">
						{/* Main Content */}
						<main className="flex-1 flex flex-col justify-center items-center px-4 py-16 md:py-24 font-minimal">
							<div className="w-full max-w-4xl">
								{/*display markdown content */}
								<DisplayMarkDown content={PrivacyPolicy} />
							</div>
						</main>
					</div>
				</Container>
			</div>
		</Suspense>
	);
}
