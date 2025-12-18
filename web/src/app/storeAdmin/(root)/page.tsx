"use client";

import { useStoreModal } from "@/hooks/storeAdmin/use-store-modal";
import { useEffect } from "react";
import { StoreModal } from "./store-modal";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// when user get here, he/she doesn't have a store.
// first, make sure user has sign-in with callback url back to this page.
//
// if user is signed-in, store dialog will be opened for the user to enter store setup wizard..
const SetupStorePage = () => {
	//1. get session from client side
	const { data: session, isPending } = authClient.useSession();
	const router = useRouter();

	const onOpen = useStoreModal((state) => state.onOpen);
	const isOpen = useStoreModal((state) => state.isOpen);

	// If user is not signed in, redirect (only after session finishes loading)
	useEffect(() => {
		if (isPending) return;
		if (!session?.user) {
			router.replace(`/signIn?callbackUrl=/storeAdmin`);
		}
	}, [isPending, router, session?.user]);

	// open create store modal
	useEffect(() => {
		if (isPending) return;
		if (!session?.user) return;
		if (!isOpen) {
			onOpen();
		}
	}, [isOpen, isPending, onOpen, session?.user]);

	// Avoid rendering modal UI while redirecting or while session is still loading
	if (isPending || !session?.user) return null;

	return <StoreModal />;
};

export default SetupStorePage;
