import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { IconMessageCircleCode } from "@tabler/icons-react";

// NOTE - display notifications from session.user.
const DropdownNotification = () => {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [notifying, setNotifying] = useState(true);
	const [isRead, setIsRead] = useState(true);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const trigger = useRef<any>(null);
	const dropdown = useRef<any>(null);
	const avatarPlaceholder = "/images/user/avatar_placeholder.png";

	const { data: session } = useSession();

	// close on click outside
	useEffect(() => {
		const clickHandler = ({ target }: MouseEvent) => {
			if (!dropdown.current) return;
			if (
				!dropdownOpen ||
				dropdown.current.contains(target) ||
				trigger.current.contains(target)
			)
				return;
			setDropdownOpen(false);
		};
		document.addEventListener("click", clickHandler);

		return () => document.removeEventListener("click", clickHandler);
	});

	// close if the esc key is pressed
	useEffect(() => {
		const keyHandler = ({ keyCode }: KeyboardEvent) => {
			if (!dropdownOpen || keyCode !== 27) return;
			setDropdownOpen(false);
		};
		document.addEventListener("keydown", keyHandler);

		return () => document.removeEventListener("keydown", keyHandler);
	});

	const notifications = session?.user.notifications;

	//console.log(`notifcations: ${JSON.stringify(session?.user.notifications)}`);

	useEffect(() => {
		notifications?.map((n) => {
			if (n.isRead === false) setIsRead(false);
		});
	}, [notifications]);

	if (session === null) return;
	if (notifications === null) return;

	return (
		<div className="relative">
			<Link
				ref={trigger}
				onClick={() => {
					setNotifying(false);
					setDropdownOpen(!dropdownOpen);
				}}
				className="relative flex size-8.5 items-center justify-center rounded-full border-[0.5px] border-gray/20
         bg-stroke/20 hover:text-meta-1 dark:border-strokedark dark:bg-meta-4 dark:text-primary dark:hover:text-meta-1"
				href="#"
			>
				{/* show if there's unread notification */}
				{!isRead && (
					<span
						className={`absolute -right-0.5 -top-0.5 z-1 size-2 rounded-full bg-meta-1 ${
							notifying === false ? "hidden" : "inline"
						}`}
					>
						<span className="absolute -z-1 inline-flex size-full animate-ping rounded-full bg-meta-1 opacity-75" />
					</span>
				)}
				<IconMessageCircleCode className="text-slate-400 hover:opacity-50 duration-300 ease-in-out size-5" />
			</Link>

			{/* <!-- Dropdown Start --> */}
			<div
				ref={dropdown}
				onFocus={() => setDropdownOpen(true)}
				onBlur={() => setDropdownOpen(false)}
				className={`absolute -right-16 mt-2.5 flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:right-0 sm:w-80 ${
					dropdownOpen === true ? "block" : "hidden"
				}`}
			>
				<div className="px-4.5 py-3">
					<h5 className="text-sm font-medium text-bodydark2">
						{t("notification")}
					</h5>
				</div>

				<ul className="flex h-auto flex-col overflow-y-auto">
					{notifications?.map((n) => (
						<li key={n.id}>
							<Link
								className="flex gap-4.5 border-t border-stroke px-4.5 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
								href="/account/notification"
							>
								<div className="size-12.5 rounded-full">
									<Image
										width={112}
										height={112}
										src={n.Sender.image || avatarPlaceholder}
										alt="User"
										className="aspect-square rounded-full bg-background object-cover hover:opacity-50"
										style={{
											width: "auto",
											height: "auto",
										}}
									/>
								</div>

								<div>
									<h6 className="text-sm font-medium text-black dark:text-primary">
										{n.Sender.name}
									</h6>
									<div className="text-sm">{n.subject}</div>
									<div className="text-sm">{n.message.substring(0, 100)}</div>
									<div className="text-xs">
										{n.updatedAt.toString().substring(0, 10)}
									</div>
								</div>
							</Link>
						</li>
					))}
				</ul>
			</div>
			{/* <!-- Dropdown End --> */}
		</div>
	);
};

export default DropdownNotification;
