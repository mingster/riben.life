import { redirect } from "next/navigation";

export default function HomePage() {
	const storeId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID;
	if (storeId) {
		redirect(`/shop/${storeId}`);
	} else {
		redirect("/unv");
	}
}
