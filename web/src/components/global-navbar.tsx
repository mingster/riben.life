"use client";
import clsx from "clsx";

import DropdownNotification from "@/components/dropdown-notification";
import { useEffect, useState } from "react";

import DropdownCart from "@/components/dropdown-cart";
import ThemeToggler from "@/components/theme-toggler";
import { IconHome } from "@tabler/icons-react";
//import { cn } from '@/lib/utils';
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { BackgroundImage } from "./BackgroundImage";
import DropdownUser from "./auth/dropdown-user";

//import { useI18n } from '@/providers/i18n-provider';
//import { useTranslation } from '@/app/i18n/client';

interface NavbarProps {
	title: string;
}

export function GlobalNavbar({ title }: NavbarProps) {
	const [mounted, setMounted] = useState(false);
	const [isOpaque, setIsOpaque] = useState(false);

	const { data: session } = authClient.useSession();
	const user = session?.user;

	useEffect(() => {
		const offset = 50;
		function onScroll() {
			if (!isOpaque && window.scrollY > offset) {
				setIsOpaque(true);
			} else if (isOpaque && window.scrollY <= offset) {
				setIsOpaque(false);
			}
		}
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", onScroll);
			//window.addEventListener("scroll", onScroll, { passive: true } as any);
		};
	}, [isOpaque]);

	useEffect(() => {
		setMounted(true);
	}, []);
	if (!mounted) return <></>;

	/*
  if (process.env.NODE_ENV === 'development') {
	log.debug('session: ' + JSON.stringify(session));
	log.debug('user: ' + JSON.stringify(user));
  }
  */
	const logo = null;

	return (
		<>
			<BackgroundImage />
			<header
				className={clsx(
					"sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-slate-900/10 dark:border-slate-50/[0.06]",
					isOpaque
						? "bg-transparent supports-backdrop-blur:bg-white/95 dark:bg-gray-900/5"
						: "bg-primary/20 supports-backdrop-blur:bg-white/60 dark:bg-gray-900/50",
				)}
			>
				{" "}
				<div className="mx-4 flex h-14 items-center sm:mx-8">
					<div className="flex items-center space-x-4 lg:space-x-0">
						<Link href="/" className="flex cursor-pointer">
							{logo != null ? (
								<>
									<Image
										src={logo}
										className="h-17 w-100 pl-0 pt-0"
										alt={"LOGO"}
									/>
								</>
							) : (
								<>
									<IconHome className="mr-0 size-4" />
									<h1 className="font-bold">{title}</h1>
								</>
							)}
						</Link>
					</div>
					<div className="flex flex-1 items-center justify-end space-x-1">
						<ThemeToggler />
						<DropdownNotification />
						<DropdownUser />
						<DropdownCart />
					</div>
				</div>
			</header>
		</>
	);
}
