import { redirect } from "next/navigation";

type Params = Promise<{ storeId: string }>;

/** Canonical LIFF waitlist URL uses query (`/liff/waitlist?storeId=`). */
export default async function LiffStoreWaitlistRedirectPage(props: {
	params: Params;
}) {
	const { storeId: raw } = await props.params;
	const storeId = raw?.trim() ?? "";
	if (!storeId) {
		redirect("/unv");
	}
	redirect(`/liff/waitlist?storeId=${encodeURIComponent(storeId)}`);
}
