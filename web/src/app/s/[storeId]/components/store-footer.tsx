"use client";
import type { Store } from "@/types";

import { Button } from "@/components/ui/button";

import { useCart } from "@/hooks/use-cart";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { useI18n } from "@/providers/i18n-provider";
import BusinessHours from "@/lib/businessHours";

export interface props {
	store: Store;
	useBusinessHours?: boolean;
	businessHours?: string | null;
	initialVisible?: boolean;
}

// store footer, show fixed sticky checkout button.
//
export const StoreFooter: React.FC<props> = ({
	store,
	useBusinessHours = false,
	businessHours = null,
	initialVisible = true,
}) => {
	const router = useRouter();

	const params = useParams<{ storeId: string; facilityId: string }>();
	//console.log("storeId", params.storeId, "facilityId", params.facilityId);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const cart = useCart();
	const [numInCart, setNumInCart] = useState(cart.totalItems);
	const [isOpen, setIsOpen] = useState<boolean | null>(null);
	const [visible, setVisible] = useState(initialVisible);

	function onCheckout() {
		if (params.facilityId !== null) {
			router.push(
				`/s/${params.storeId}/checkout/?facilityId=${params.facilityId}`,
			);
		} else {
			router.push(`/s/${params.storeId}/checkout`);
		}
		//router.push(`/s/${params.storeId}/checkout/?facilityId=${params.facilityId}`);
	}

	useEffect(() => {
		setNumInCart(cart.totalItems);
	}, [cart.totalItems]);

	// compute business hours on client to avoid SSR/CSR mismatch
	useEffect(() => {
		if (useBusinessHours && businessHours) {
			try {
				const bh = new BusinessHours(businessHours);
				setIsOpen(bh.isOpenNow());
			} catch (_err) {
				// fallback to visible to avoid breaking UX
				setIsOpen(true);
			}
		} else {
			setIsOpen(true);
		}
	}, [useBusinessHours, businessHours]);

	// turn off footer in those pages
	const pathName = usePathname();

	// Check if we're on the store home page (exactly /s/[storeId])
	const isStoreHome = pathName === `/s/${params.storeId}`;

	if (
		isStoreHome ||
		pathName.includes("billing") ||
		pathName.includes("checkout") ||
		pathName.includes("faq") ||
		pathName.includes("privacy") ||
		pathName.includes("support") ||
		pathName.includes("terms") ||
		pathName.includes("recharge") ||
		pathName.includes("my-orders") ||
		pathName.includes("my-credit-ledger") ||
		pathName.includes("reservation") ||
		pathName.includes("waiting-list")
	) {
		if (visible) setVisible(false);
	}
	//}, [visible]);

	if (!visible) return <></>;
	// avoid hydration mismatch: wait for isOpen computation when businessHours is used
	if (isOpen === null) return null;
	if (!isOpen) return null;

	//w-full shadow backdrop-blur dark:shadow-secondary mx-4 flex h-14 items-center justify-center
	//hidden sm:block
	return (
		<footer className="sticky bottom-0 w-full shadow backdrop-blur dark:shadow-secondary p-3 sm:p-4 lg:p-5 bg-body opacity-90">
			<div className="rounded xl:container xl:mx-auto">
				<div className="flex w-full justify-center">
					<strong className="relative w-full sm:w-1/2 inline-flex items-center rounded">
						{numInCart > 0 && (
							<span className="absolute -top-1 -right-1 sm:-right-2 size-5 sm:size-6 rounded-full bg-red-800 text-slate-100 flex justify-center items-center text-xs sm:text-sm pb-0.5 sm:pb-1 z-10">
								<span>{numInCart}</span>
							</span>
						)}
						<Button
							onClick={onCheckout}
							disabled={cart.items.length === 0}
							className="w-full h-12 sm:h-11 hover:opacity-50 active:opacity-70"
						>
							<div className="flex w-full items-center justify-between gap-2">
								<div className="grow font-bold text-base sm:text-lg lg:text-xl truncate">
									{t("cart_dropDown_confirm")}
								</div>

								<div className="self-end shrink-0 text-sm sm:text-base lg:text-lg">
									<Currency value={cart.cartTotal} />
								</div>
							</div>
						</Button>
					</strong>
				</div>
			</div>
		</footer>
	);
};
