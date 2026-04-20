import { Suspense } from "react";
import ClientSignIn from "@/components/auth/client-signin";
import { Loader } from "@/components/loader";

const SIGNIN_BG = "/images/signin/left.webp";

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
export default async function SignInPage(props: Props) {
	const { searchParams } = props;

	const searchParamsObj = await searchParams;
	const callbackUrl = (searchParamsObj.callbackUrl as string) || "/";
	const lineOnlyRaw = searchParamsObj.lineOnly;
	const lineOnlyPreferred =
		lineOnlyRaw === "1" ||
		lineOnlyRaw === "true" ||
		lineOnlyRaw === "yes" ||
		lineOnlyRaw === "on";

	return (
		<Suspense
			fallback={
				<div className="flex min-h-0 w-full flex-1 items-center justify-center">
					<Loader />
				</div>
			}
		>
			<div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden py-12 sm:py-16">
				<div
					className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
					aria-hidden
				>
					<div
						className="absolute inset-0 size-full origin-center scale-110 bg-cover bg-center bg-no-repeat opacity-50 blur-none"
						style={{ backgroundImage: `url('${SIGNIN_BG}')` }}
					/>
				</div>
				<div className="relative z-10 flex w-full shrink-0 justify-center px-4">
					<ClientSignIn
						callbackUrl={callbackUrl}
						lineOnlyPreferred={lineOnlyPreferred}
					/>
				</div>
			</div>
		</Suspense>
	);
}
