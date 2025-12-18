"use client";
import {
	IconBrandStripe,
	IconHome,
	IconLock,
	IconSettings,
} from "@tabler/icons-react";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { NotMountSkeleton } from "@/components/not-mount-skeleton";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";
import DialogSignIn from "./dialog-sign-in";
import SignOutButton from "./sign-out-button";

interface UserButtonProps {
	db_user?: User | undefined | null;
}

export default function DropdownUser({ db_user }: UserButtonProps) {
	const [mounted, setMounted] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const avatarPlaceholder = "/img/avatar_placeholder.png";

	const { data: session } = authClient.useSession();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <NotMountSkeleton />;

	//logger.info("session", session);

	if (!session) return null;
	const user = session.user;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="icon"
					className="h-10 w-10 flex-none rounded-full border-gray/20 bg-stroke/20 hover:text-meta-1 active:bg-stroke/30 dark:border-strokedark dark:bg-meta-4 dark:text-primary dark:hover:text-meta-1 sm:h-9 sm:w-9"
				>
					<Image
						src={user.image || avatarPlaceholder}
						alt="User profile picture"
						width={30}
						height={30}
						className="aspect-square rounded-full bg-background object-cover hover:opacity-50"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56 sm:w-56 min-w-[200px]">
				{!session ? (
					<DropdownMenuGroup>
						<DropdownMenuItem className="" asChild>
							<DialogSignIn />
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</DropdownMenuGroup>
				) : (
					<>
						<DropdownMenuLabel className="px-2 py-2 sm:px-2 sm:py-1.5">
							{session.user.name || "User"}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem className="cursor-pointer" asChild>
								<Link
									href="/account/subscription"
									className="flex items-center gap-2"
								>
									<IconBrandStripe className="size-4 shrink-0" />
									<span>{t("user_profile_subscription")}</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem className="cursor-pointer" asChild>
								<Link href="/account" className="flex items-center gap-2">
									<IconSettings className="size-4 shrink-0" />
									<span>{t("user_profile_myAccount")}</span>
								</Link>
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<DropdownMenuItem className="cursor-pointer" asChild>
								<Link href="/" className="flex items-center gap-2">
									<IconHome className="size-4 shrink-0" />
									<span>{t("home")}</span>
								</Link>
							</DropdownMenuItem>

							{(user.role === "admin" ||
								user.role === "storeAdmin" ||
								user.role === "staff" ||
								user.role === "owner") && (
								<DropdownMenuItem className="cursor-pointer" asChild>
									<Link href="/storeAdmin/" className="flex items-center gap-2">
										<IconLock className="size-4 shrink-0" />
										<span>{t("user_profile_linkTo_storeDashboard")}</span>
									</Link>
								</DropdownMenuItem>
							)}

							{user.role === "admin" && (
								<>
									<DropdownMenuItem className="cursor-pointer" asChild>
										<Link href="/sysAdmin" className="flex items-center gap-2">
											<IconLock className="size-4 shrink-0" />
											<span>{t("user_profile_linkTo_admin")}</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							)}
						</DropdownMenuGroup>

						<DropdownMenuItem className="cursor-pointer" asChild>
							<SignOutButton />
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
