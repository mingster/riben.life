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
//import { Role } from "@/types/enum";
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

	//console.log("session", session);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <NotMountSkeleton />;

	//logger.info("session", session);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="icon"
					className="flex-none rounded-full border-gray/20 bg-stroke/20 hover:text-meta-1
          dark:border-strokedark dark:bg-meta-4 dark:text-primary dark:hover:text-meta-1"
				>
					<Image
						src={session?.user?.image || avatarPlaceholder}
						alt="User profile picture"
						width={30}
						height={30}
						className="aspect-square rounded-full bg-background object-cover hover:opacity-50"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				{!session ? (
					<DropdownMenuGroup>
						<DropdownMenuItem asChild>
							<DialogSignIn />
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</DropdownMenuGroup>
				) : (
					<>
						<DropdownMenuLabel>{session.user.name || "User"}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem className="cursor-pointer" asChild>
								<Link href="/account/subscription">
									<IconBrandStripe className="mr-0 size-4" />
									<span>{t("user_profile_subscription")}</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem className="cursor-pointer" asChild>
								<Link href="/account">
									<IconSettings className="mr-0 size-4" />
									<span>{t("user_profile_myAccount")}</span>
								</Link>
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<DropdownMenuItem className="cursor-pointer" asChild>
								<Link href="/">
									<IconHome className="mr-0 size-4" />
									{t("home")}
								</Link>
							</DropdownMenuItem>

							{(session?.user?.role === "affiliate" ||
								session?.user?.role === "admin") && (
								<DropdownMenuItem className="cursor-pointer" asChild>
									<Link href="/storeAdmin/">
										<IconLock className="mr-0 size-4" />
										<span>{t("user_profile_linkTo_storeDashboard")}</span>
									</Link>
								</DropdownMenuItem>
							)}

							{session?.user?.role === "admin" && (
								<>
									<DropdownMenuItem className="cursor-pointer" asChild>
										<Link href="/sysAdmin">
											<IconLock className="mr-0 size-4" />
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
