"use client";

import { BackgroundImage } from "@/components/BackgroundImage";
import DropdownCart from "@/components/dropdown-cart";
import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/notification/dropdown-notification";
import DropdownUser from "@/components/auth/dropdown-user";
import { ThemeToggler } from "@/components/theme-toggler";
import { useScrollDirection } from "@/lib/use-scroll-direction";
import type { Store } from "@/types";
import { SheetMenu } from "./sheet-menu";

export interface props {
	visible: boolean;
	store: Store;
}

export const StoreNavbar: React.FC<props> = ({ store, visible }) => {
	/*
  const [active, setActive] = useState("");
  //console.log("active", active);
  const [visible, setVisible] = useState(true);
  const pathName = usePathname();
  if (pathName.includes("checkout")) {
	setVisible(false);
  }
  //const router = useRouter();
  */

	// auto hide navbar on scroll
	const scrollDirection = useScrollDirection();
	//<header className={`sticky ${scrollDirection === "down" ? "-top-24" : "top-0"} z-10 w-full shadow backdrop-blur dark:shadow-secondary`}>

	// normal navbar
	//<header className="sticky top-0 z-10 w-full shadow backdrop-blur dark:shadow-secondary">

	/*

	const onNavlinkClick = (
		e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
	) => {
		e.preventDefault();
		const target = window.document.getElementById(
			e.currentTarget.href.split("#")[1],
		);
		if (target) {
			target.scrollIntoView({ behavior: "smooth" });
		}
	};

  // turn off footer in those pages
	const pathName = usePathname();

  if (
		pathName.includes("billing") ||
		//pathName.includes("checkout") ||
		pathName.includes("faq") ||
		pathName.includes("privacy") ||
		pathName.includes("support") ||
		pathName.includes("terms")
	) {
		visible = false;
	}
	*/

	if (store == null) return;
	if (store.Categories == null) return;

	if (!visible) return <></>;

	return (
		<>
			{/* background image*/}
			<BackgroundImage />
			<header
				className={`sticky ${scrollDirection === "down" ? "-top-24" : "top-0"} z-10 w-full shadow backdrop-blur dark:shadow-secondary`}
			>
				<div className="mx-3 flex h-14 items-center gap-1.5 px-1 sm:mx-1 sm:gap-2 sm:px-4 lg:px-6">
					<div className="flex items-center shrink-0">
						<SheetMenu store={store} />
					</div>

					<h1 className="grow text-center text-base font-bold leading-tight tracking-tighter truncate px-2 sm:text-lg lg:text-xl lg:leading-[1.1]">
						{store.name}
					</h1>

					{/*<!--  Hidden by default, but visible if screen is larger than 1024px --> */}
					<div className="hidden md:block shrink-0">
						<div className="flex flex-1 items-center justify-end gap-1.5 lg:gap-2">
							<ThemeToggler />
							<DropdownMessage messages={store.StoreAnnouncement} />
							<DropdownNotification />
							<DropdownUser />
							<DropdownCart />
						</div>
					</div>
				</div>
			</header>
		</>
	);
};
