"use client";

import { useToast } from "@/components/ui/use-toast";
import axios, { type AxiosError } from "axios";
import { MessageSquareText, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { formatDateTime } from "@/utils/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { SupportTicket } from "@/types";
import { TicketStatus } from "@/types/enum";
import Image from "next/image";
import { useTranslation } from "react-i18next";

interface props {
	thread:
		| (SupportTicket[] & {
				//images: ProductImage[];
				//productPrices: ProductPrice[];
				//ProductImages: ProductImages[] | null;
				//ProductAttribute: ProductAttribute | null;
		  })
		| [];
}

// in edit mode,display all replies in this ticket (thread id)
// or create a new ticket
//
export const DisplayThread = ({ thread }: props) => {
	const router = useRouter();
	const params = useParams();
	//const { toast } = useToast();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { toast } = useToast();

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const onClose = async () => {
		setLoading(true);

		await axios.delete(
			`${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/ticket/${params.ticketId}/thread/close`,
		);

		toast({
			title: "Ticket closed.",
			description: "",
			variant: "success",
		});
		setLoading(false);
		setOpen(false);

		router.push(`/${params.storeId}/support`);
	};

	//console.log(`DisplayThread: ${JSON.stringify(thread)}`);
	const avatarPlaceholder = "/images/user/avatar_placeholder.png";

	const ticketTitle = `${t("support") + t("ticket")}`;

	return (
		<>
			<AlertModal
				isOpen={open}
				onClose={() => setOpen(false)}
				onConfirm={onClose}
				loading={loading}
			/>

			<div className="w-full">
				<Heading title={ticketTitle} description="" />

				<div className="flex flex-row justify-between min-h-10">
					<div className="font-bold justify-self-auto self-center">
						{thread[0].subject}
					</div>

					<div className="text-sm justify-self-auto self-center">
						{t("status")}: {TicketStatus[thread[0].status]}
					</div>

					<div className="text-sm justify-self-auto self-center">
						<a className="" href="#reply">
							{t("reply")}
						</a>
						<Button
							variant="link"
							type="button"
							className="pl-2"
							onClick={() => setOpen(true)}
						>
							{t("close_ticket")}
						</Button>
					</div>
				</div>
			</div>

			{thread.map((ticket: SupportTicket) => (
				<div key={ticket.id} className="flex flex-row gap-5 border-collapse">
					<div className="pl-1 max-w-120">
						{/*user box*/}
						<div className="basis-1/3 flex gap-2">
							<Image
								src={ticket.Sender?.image || avatarPlaceholder}
								alt="User profile picture"
								width={30}
								height={30}
								className="aspect-square rounded-full bg-background object-cover hover:opacity-50"
							/>
							<span className="text-sm">{ticket.Sender.name}</span>
						</div>
					</div>

					<div>
						<div className="flex">
							<MessageSquareText className="size-6 pr-2" />
							{ticket.message}
						</div>
						<div className="text-xs">{formatDateTime(ticket.updatedAt)}</div>
					</div>
				</div>
			))}
		</>
	);
};
