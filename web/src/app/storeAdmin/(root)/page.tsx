"use client";

import { useStoreModal } from "@/hooks/storeAdmin/use-store-modal";
import { useEffect } from "react";
import { StoreModal } from "./store-modal";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const SetupStorePage = () => {
	const { data: session, isPending } = authClient.useSession();
	const router = useRouter();

	const onOpen = useStoreModal((state) => state.onOpen);
	const isOpen = useStoreModal((state) => state.isOpen);

	useEffect(() => {
		if (isPending) return;
		if (!session?.user) {
			router.replace(`/signIn?callbackUrl=/storeAdmin`);
		}
	}, [isPending, router, session?.user]);

	useEffect(() => {
		if (isPending) return;
		if (!session?.user) return;
		if (!isOpen) {
			onOpen();
		}
	}, [isOpen, isPending, onOpen, session?.user]);

	if (isPending || !session?.user) return null;

	return <StoreModal />;
};

export default SetupStorePage;
