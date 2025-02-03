"use client";

import LanguageToggler from "@/components/language-toggler";

export function StoreAdminFooter() {
	return (
		<div className="z-20 w-full ">
			<div className="mx-4 flex h-14 items-center md:mx-8 text-primary text-xs">
				<LanguageToggler />
			</div>
		</div>
	);
}
