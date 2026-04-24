"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconBrandLine } from "@tabler/icons-react";
import Link from "next/link";
import { useQRCode } from "next-qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { cancelMyWaitlistEntryAction } from "@/actions/store/waitlist/cancel-my-waitlist-entry";
import { createWaitlistEntryAction } from "@/actions/store/waitlist/create-waitlist-entry";
import {
	buildCreateWaitlistEntrySchema,
	type CreateWaitlistEntryInput,
} from "@/actions/store/waitlist/create-waitlist-entry.validation";
import { getWaitlistQueuePositionAction } from "@/actions/store/waitlist/get-waitlist-queue-position";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useIsHydrated } from "@/hooks/use-hydrated";
import {
	clearWaitlistFromStorage,
	getSavedPhoneFromFormPhoneOtp,
	loadWaitlistFromStorage,
	saveWaitlistToStorage,
	WAITLIST_ADULT_COUNT_OPTIONS,
	WAITLIST_CHILD_COUNT_OPTIONS,
} from "@/lib/store/waitlist/waitlist-local-storage";
import { cn } from "@/lib/utils";
import { useResolvedCustomerStoreBasePath } from "@/providers/customer-store-base-path";
import { useI18n } from "@/providers/i18n-provider";
import { WaitListStatus } from "@/types/waitlist-status";
import { formatDurationMsShort } from "@/utils/datetime-utils";
import { startRepeatingWaitlistCalledBell } from "@/utils/waitlist-called-bell";
import type { WaitlistSessionBlock } from "@/utils/waitlist-session";

function WaitlistLineFriendQrBlock({
	lineAddFriendUrl,
	message,
	openInLineLabel,
}: {
	lineAddFriendUrl: string;
	message: string;
	openInLineLabel: string;
}) {
	const { SVG } = useQRCode();

	return (
		<div
			className="rounded-lg border border-[#06C755]/40 bg-[#06C755]/5 p-4 sm:p-5"
			role="region"
			aria-label={message}
		>
			<div className="flex flex-col items-center gap-3">
				<div className="flex items-center gap-2 text-[#06C755]">
					<IconBrandLine className="h-6 w-6 shrink-0" />
					<span className="text-sm font-semibold">LINE</span>
				</div>
				<p className="text-center text-base font-medium leading-snug text-foreground sm:text-lg">
					{message}
				</p>
				<div className="rounded-lg border-2 border-border bg-white p-3 shadow-sm">
					<SVG
						text={lineAddFriendUrl}
						options={{
							margin: 2,
							width: 200,
						}}
					/>
				</div>
				<Button
					asChild
					variant="outline"
					className="h-10 w-full max-w-xs touch-manipulation border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10 sm:h-9 sm:min-h-0"
				>
					<a href={lineAddFriendUrl} target="_blank" rel="noopener noreferrer">
						{openInLineLabel}
					</a>
				</Button>
			</div>
		</div>
	);
}

interface WaitlistJoinClientProps {
	storeId: string;
	storeName: string;
	waitlistEnabled: boolean;
	waitlistRequireSignIn: boolean;
	/** When true, the join form collects a required name (store RSVP setting). */
	waitlistRequireName: boolean;
	/** When true, the join form requires a valid phone (store waitlist setting). */
	waitlistRequirePhone: boolean;
	prefillPhone?: string | null;
	/** Signed-in user display name for waitlist name field when required */
	prefillName?: string | null;
	/** False when store uses business hours and is currently closed */
	waitlistAcceptingJoins: boolean;
	/** LINE add-friend URL when store has LINE ID in contact settings */
	lineAddFriendUrl: string | null;
	currentSessionBlock: WaitlistSessionBlock | null;
	/**
	 * When set, replaces the default “place order” link shown while waiting (e.g. LIFF store home).
	 */
	postQueueSecondaryAction?: {
		href: string;
		/** i18n key (snake_case) */
		labelKey: string;
	} | null;
	/** Optional callback when this ticket transitions to `called`. */
	onCalled?: (entry: { queueNumber: number; verificationCode: string }) => void;
}

export function WaitlistJoinClient({
	storeId,
	storeName,
	waitlistEnabled,
	waitlistRequireSignIn,
	waitlistRequireName,
	waitlistRequirePhone,
	prefillPhone,
	prefillName,
	waitlistAcceptingJoins,
	lineAddFriendUrl,
	currentSessionBlock,
	postQueueSecondaryAction,
	onCalled,
}: WaitlistJoinClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const customerBase = useResolvedCustomerStoreBasePath(storeId);
	const isHydrated = useIsHydrated();
	const [submittedEntry, setSubmittedEntry] = useState<{
		queueNumber: number;
		verificationCode: string;
		id: string;
		sessionBlock: string;
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [ahead, setAhead] = useState<number | null>(null);
	const [waitingInSession, setWaitingInSession] = useState<number | null>(null);
	const [queueStatus, setQueueStatus] = useState<string | null>(null);
	const [joinedAtEpoch, setJoinedAtEpoch] = useState<number | null>(null);
	const [serverWaitTimeMs, setServerWaitTimeMs] = useState<number | null>(null);
	const [waitTick, setWaitTick] = useState(0);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [isCancellingWaitlist, setIsCancellingWaitlist] = useState(false);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const prevQueueStatusRef = useRef<string | null>(null);
	const calledBellStopRef = useRef<(() => void) | null>(null);
	const [calledAckDialogOpen, setCalledAckDialogOpen] = useState(false);

	const sessionBlockLabel = useCallback(
		(block: string) => {
			switch (block) {
				case "morning":
					return t("waitlist_session_morning");
				case "afternoon":
					return t("waitlist_session_afternoon");
				case "evening":
					return t("waitlist_session_evening");
				default:
					return block;
			}
		},
		[t],
	);

	const refreshPosition = useCallback(async () => {
		if (!submittedEntry) return;
		const result = await getWaitlistQueuePositionAction({
			storeId,
			waitlistId: submittedEntry.id,
			verificationCode: submittedEntry.verificationCode,
		});
		const data = result?.data;
		if (!data?.ok) {
			setAhead(null);
			setWaitingInSession(null);
			setQueueStatus(null);
			return;
		}
		setAhead(data.ahead);
		setWaitingInSession(data.waitingInSession);
		setQueueStatus(data.status ?? null);
		if (typeof data.joinedAt === "number") {
			setJoinedAtEpoch(data.joinedAt);
		}
		if (data.waitTimeMs != null) {
			setServerWaitTimeMs(data.waitTimeMs);
		}
	}, [storeId, submittedEntry]);

	useEffect(() => {
		if (!submittedEntry) {
			setJoinedAtEpoch(null);
			setServerWaitTimeMs(null);
		}
	}, [submittedEntry]);

	useEffect(() => {
		if (!submittedEntry || queueStatus !== WaitListStatus.waiting) {
			return;
		}
		const id = window.setInterval(() => {
			setWaitTick((n) => n + 1);
		}, 1000);
		return () => clearInterval(id);
	}, [submittedEntry, queueStatus]);

	useEffect(() => {
		if (queueStatus !== WaitListStatus.waiting) {
			setCancelDialogOpen(false);
		}
	}, [queueStatus]);

	useEffect(() => {
		if (!isHydrated) return;
		const saved = loadWaitlistFromStorage(storeId);
		if (saved) {
			setSubmittedEntry({
				id: saved.id,
				queueNumber: saved.queueNumber,
				verificationCode: saved.verificationCode,
				sessionBlock: saved.sessionBlock,
			});
		}
	}, [isHydrated, storeId]);

	useEffect(() => {
		if (!submittedEntry) {
			if (pollRef.current) {
				clearInterval(pollRef.current);
				pollRef.current = null;
			}
			return;
		}
		void refreshPosition();
		pollRef.current = setInterval(() => void refreshPosition(), 12000);
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, [submittedEntry, refreshPosition]);

	const acknowledgeWaitlistCalled = useCallback(() => {
		calledBellStopRef.current?.();
		calledBellStopRef.current = null;
		setCalledAckDialogOpen(false);
	}, []);

	useEffect(() => {
		return () => {
			calledBellStopRef.current?.();
			calledBellStopRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!calledAckDialogOpen) {
			return;
		}
		const blockEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		window.addEventListener("keydown", blockEscape, true);
		return () => window.removeEventListener("keydown", blockEscape, true);
	}, [calledAckDialogOpen]);

	useEffect(() => {
		if (!submittedEntry) {
			calledBellStopRef.current?.();
			calledBellStopRef.current = null;
			setCalledAckDialogOpen(false);
			prevQueueStatusRef.current = null;
			return;
		}
		if (queueStatus === null) {
			return;
		}
		const prev = prevQueueStatusRef.current;
		prevQueueStatusRef.current = queueStatus;
		if (
			queueStatus === WaitListStatus.called &&
			prev !== WaitListStatus.called &&
			prev !== null
		) {
			calledBellStopRef.current?.();
			calledBellStopRef.current = startRepeatingWaitlistCalledBell();
			setCalledAckDialogOpen(true);
			onCalled?.({
				queueNumber: submittedEntry.queueNumber,
				verificationCode: submittedEntry.verificationCode,
			});
		}
	}, [queueStatus, submittedEntry, onCalled]);

	/** Do not restore an already-called ticket after refresh — drop persisted entry once staff calls the number. */
	useEffect(() => {
		if (!submittedEntry || queueStatus !== WaitListStatus.called) {
			return;
		}
		clearWaitlistFromStorage();
	}, [queueStatus, submittedEntry]);

	const waitlistEntrySchema = useMemo(
		() =>
			buildCreateWaitlistEntrySchema(waitlistRequireName, waitlistRequirePhone),
		[waitlistRequireName, waitlistRequirePhone],
	);

	const form = useForm<CreateWaitlistEntryInput>({
		// Zod 4 / refined union: @hookform/resolvers input typing vs FieldValues; runtime is correct
		resolver: zodResolver(
			waitlistEntrySchema as any,
		) as Resolver<CreateWaitlistEntryInput>,
		defaultValues: {
			storeId,
			customerId: null,
			phone: prefillPhone ?? "",
			numOfAdult: 1,
			numOfChild: 0,
			name: prefillName ?? "",
			lastName: null,
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (!isHydrated) return;
		const current = form.getValues("phone");
		if (current?.trim()) return;
		const saved = getSavedPhoneFromFormPhoneOtp();
		if (saved) {
			form.setValue("phone", saved);
		}
	}, [isHydrated, form]);

	const handleCancelMyWaitlist = useCallback(async () => {
		if (!submittedEntry) {
			return;
		}
		setIsCancellingWaitlist(true);
		try {
			const result = await cancelMyWaitlistEntryAction({
				storeId,
				waitlistId: submittedEntry.id,
				verificationCode: submittedEntry.verificationCode,
			});
			if (result?.serverError) {
				toastError({
					title: t("waitlist_join_error") || "Error",
					description: result.serverError,
				});
				return;
			}
			clearWaitlistFromStorage();
			setSubmittedEntry(null);
			setQueueStatus(null);
			setCancelDialogOpen(false);
			toastSuccess({
				description: t("waitlist_cancel_my_wait_success"),
			});
		} finally {
			setIsCancellingWaitlist(false);
		}
	}, [storeId, submittedEntry, t]);

	const onSubmit = useCallback(
		async (data: CreateWaitlistEntryInput) => {
			setIsSubmitting(true);
			try {
				const result = await createWaitlistEntryAction({
					...data,
					storeId,
					phone: data.phone?.trim() || undefined,
					name: data.name?.trim() || undefined,
					lastName: data.lastName?.trim() || undefined,
				});
				if (result?.serverError) {
					toastError({
						title: t("waitlist_join_error") || "Error",
						description: result.serverError,
					});
					return;
				}
				if (result?.data?.entry) {
					const entry = result.data.entry;
					const rawCreated = entry.createdAt;
					const createdAtEpoch =
						rawCreated === undefined || rawCreated === null
							? undefined
							: typeof rawCreated === "bigint"
								? Number(rawCreated)
								: typeof rawCreated === "number"
									? rawCreated
									: undefined;
					const sessionBlock = String(entry.sessionBlock ?? "morning");
					if (
						typeof createdAtEpoch === "number" &&
						Number.isFinite(createdAtEpoch)
					) {
						setJoinedAtEpoch(createdAtEpoch);
					}
					setServerWaitTimeMs(null);
					setSubmittedEntry({
						id: entry.id,
						queueNumber: entry.queueNumber,
						verificationCode: entry.verificationCode,
						sessionBlock,
					});
					const d = new Date();
					d.setHours(23, 59, 59, 999);
					saveWaitlistToStorage({
						id: entry.id,
						storeId,
						queueNumber: entry.queueNumber,
						verificationCode: entry.verificationCode,
						sessionBlock,
						expiry: d.getTime(),
					});
					toastSuccess({
						description:
							(t("waitlist_joined") || "You're on the list!") +
							" " +
							(t("waitlist_show_code_to_staff") ||
								"Show your code to staff when your number is called."),
					});
				}
			} finally {
				setIsSubmitting(false);
			}
		},
		[storeId, t],
	);

	if (!waitlistEnabled) {
		return (
			<Container className="py-10">
				<Card>
					<CardHeader>
						<CardTitle>{t("waitlist_title") || "Join the waitlist"}</CardTitle>
						<CardDescription>
							{t("waitlist_not_available") ||
								"Waitlist is not available for this store."}
						</CardDescription>
					</CardHeader>
				</Card>
			</Container>
		);
	}

	if (submittedEntry) {
		void waitTick;
		const liveWaitMs =
			joinedAtEpoch != null ? Math.max(0, Date.now() - joinedAtEpoch) : null;
		const finalizedWaitMs =
			serverWaitTimeMs ??
			(queueStatus === WaitListStatus.called ? liveWaitMs : null);
		const showLiveWait =
			queueStatus === WaitListStatus.waiting && liveWaitMs != null;
		const showFinalWait =
			queueStatus === WaitListStatus.called && finalizedWaitMs != null;

		const showAhead =
			queueStatus === WaitListStatus.waiting &&
			ahead !== null &&
			waitingInSession !== null;
		const pctAhead =
			waitingInSession &&
			waitingInSession > 0 &&
			ahead !== null &&
			queueStatus === WaitListStatus.waiting
				? Math.min(
						100,
						Math.round(((waitingInSession - ahead) / waitingInSession) * 100),
					)
				: queueStatus === WaitListStatus.waiting
					? 0
					: 100;

		return (
			<Container className="py-10">
				<Card>
					<CardHeader className="text-center">
						<CardTitle className="text-base font-medium text-muted-foreground sm:text-lg">
							{t("waitlist_your_queue_number") || "Your queue number"}
						</CardTitle>
						<p
							className="mt-3 text-7xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:mt-4 sm:text-8xl md:text-9xl md:leading-none"
							aria-label={
								t("waitlist_you_are_number", {
									n: submittedEntry.queueNumber,
								}) || `You are number ${submittedEntry.queueNumber}`
							}
						>
							#{submittedEntry.queueNumber}
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						{showLiveWait && (
							<p className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-sm font-medium tabular-nums">
								{t("waitlist_wait_time_elapsed", {
									duration: formatDurationMsShort(liveWaitMs ?? 0),
								}) || `Wait time: ${formatDurationMsShort(liveWaitMs ?? 0)}`}
							</p>
						)}
						{showFinalWait && (
							<p className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-sm font-medium text-muted-foreground tabular-nums">
								{t("waitlist_wait_time_total", {
									duration: formatDurationMsShort(finalizedWaitMs ?? 0),
								}) ||
									`Total wait: ${formatDurationMsShort(finalizedWaitMs ?? 0)}`}
							</p>
						)}
						{queueStatus === WaitListStatus.called && (
							<p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm font-medium text-amber-900 dark:text-amber-100">
								{t("waitlist_status_called_message")}
							</p>
						)}
						{(queueStatus === WaitListStatus.cancelled ||
							queueStatus === WaitListStatus.no_show) && (
							<p className="text-sm text-destructive">
								{t("waitlist_entry_ended")}
							</p>
						)}

						<p className="text-sm text-muted-foreground">
							{t("waitlist_notify_when_ready") ||
								"We'll notify you when your table is ready. Show your code to staff when your number is called."}
						</p>

						<div className="rounded-lg border bg-muted/50 p-4 text-center">
							<span className="text-3xl font-mono font-bold tracking-widest">
								{submittedEntry.verificationCode}
							</span>
						</div>

						<Separator />

						{showAhead && (
							<div className="space-y-2 rounded-lg border bg-muted/30 p-4">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">
										{t("waitlist_queue_progress")}
									</span>
									<span className="font-semibold">
										{t("waitlist_ahead_count", { n: ahead })}
									</span>
								</div>
								<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary transition-all duration-500"
										style={{ width: `${pctAhead}%` }}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									{t("waitlist_waiting_in_session", {
										n: waitingInSession ?? 0,
									})}
								</p>
							</div>
						)}

						<div className="flex flex-col gap-2 pt-2">
							<Link
								href={postQueueSecondaryAction?.href ?? `${customerBase}/menu`}
							>
								<Button className="w-full">
									{postQueueSecondaryAction
										? t(postQueueSecondaryAction.labelKey)
										: t("waitlist_place_order") || "Place order while waiting"}
								</Button>
							</Link>
							{queueStatus === WaitListStatus.waiting && (
								<Button
									type="button"
									variant="outline"
									className="w-full touch-manipulation border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/60"
									onClick={() => setCancelDialogOpen(true)}
								>
									{t("waitlist_cancel_my_wait")}
								</Button>
							)}
						</div>
					</CardContent>
				</Card>

				<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
					<AlertDialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg">
						<AlertDialogHeader>
							<AlertDialogTitle>
								{t("waitlist_cancel_my_wait_confirm_title")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{t("waitlist_cancel_my_wait_confirm_description")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								disabled={isCancellingWaitlist}
								className="touch-manipulation"
							>
								{t("cancel")}
							</AlertDialogCancel>
							<Button
								type="button"
								variant="destructive"
								className="touch-manipulation sm:min-h-0"
								disabled={isCancellingWaitlist}
								onClick={() => void handleCancelMyWaitlist()}
							>
								{isCancellingWaitlist
									? t("waitlist_cancel_my_wait_cancelling")
									: t("waitlist_cancel_my_wait")}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<AlertDialog
					open={calledAckDialogOpen}
					onOpenChange={(open) => {
						if (open) setCalledAckDialogOpen(true);
					}}
				>
					<AlertDialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg">
						<AlertDialogHeader>
							<AlertDialogTitle>{t("waitlist_status_called")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("waitlist_status_called_message")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="sm:justify-center">
							<Button
								type="button"
								className="w-full touch-manipulation sm:w-auto sm:min-w-32"
								onClick={acknowledgeWaitlistCalled}
							>
								{t("ok")}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{lineAddFriendUrl ? (
					<WaitlistLineFriendQrBlock
						lineAddFriendUrl={lineAddFriendUrl}
						message={
							t("waitlist_line_friend_for_notifications") ||
							"Add our LINE official account as a friend to receive table-ready notifications."
						}
						openInLineLabel={
							t("waitlist_line_open_add_friend") || "Open in LINE"
						}
					/>
				) : null}
			</Container>
		);
	}

	return (
		<Container className="py-10">
			{!waitlistAcceptingJoins && currentSessionBlock === null && (
				<Card className="mb-4 border-muted">
					<CardHeader className="py-4">
						<CardTitle className="text-base">
							{t("waitlist_closed_now_title")}
						</CardTitle>
						<CardDescription>{t("waitlist_closed_now_body")}</CardDescription>
					</CardHeader>
				</Card>
			)}
			{waitlistAcceptingJoins && currentSessionBlock && (
				<p className="mb-4 text-center text-sm text-muted-foreground">
					{t("waitlist_current_session_label")}:{" "}
					<span className="font-medium text-foreground">
						{sessionBlockLabel(currentSessionBlock)}
					</span>
				</p>
			)}
			<Card>
				<CardHeader>
					<CardTitle>{t("waitlist_title") || "Join the waitlist"}</CardTitle>
					<CardDescription>
						{t("waitlist_subtitle", { storeName }) ||
							`Join the queue at ${storeName}. We'll notify you when your table is ready.`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{waitlistRequireSignIn && (
						<p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
							{t("waitlist_sign_in_required") ||
								"Please sign in to join the waitlist."}
						</p>
					)}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							{waitlistRequireName && (
								<FormField
									control={form.control}
									name="name"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t("waitlist_name_required_label") || "Name"}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													className={cn(
														"h-10 text-base sm:h-9 sm:text-sm touch-manipulation",
														fieldState.error &&
															"border-destructive focus-visible:ring-destructive",
													)}
													autoComplete="name"
													placeholder={
														t("waitlist_name_placeholder") || "Your name"
													}
													disabled={isSubmitting || !waitlistAcceptingJoins}
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
							<div className="grid grid-cols-2 gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="numOfAdult"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t("waitlist_party_adults") || "Adults"}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<Select
												value={String(field.value ?? 1)}
												onValueChange={(v) => field.onChange(Number(v))}
												disabled={isSubmitting || !waitlistAcceptingJoins}
											>
												<FormControl>
													<SelectTrigger
														className={cn(
															"min-h-24 w-full text-5xl font-semibold tabular-nums touch-manipulation sm:min-h-28 sm:text-6xl md:text-6xl [&>span]:justify-center [&>span]:text-center",
															fieldState.error &&
																"border-destructive focus:ring-destructive",
														)}
													>
														<SelectValue
															placeholder={
																t("waitlist_party_adults") || "Adults"
															}
														/>
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{WAITLIST_ADULT_COUNT_OPTIONS.map((n) => (
														<SelectItem key={n} value={String(n)}>
															{n}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="numOfChild"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t("waitlist_party_children") || "Children"}
											</FormLabel>
											<Select
												value={String(field.value ?? 0)}
												onValueChange={(v) => field.onChange(Number(v))}
												disabled={isSubmitting || !waitlistAcceptingJoins}
											>
												<FormControl>
													<SelectTrigger
														className={cn(
															"min-h-24 w-full text-5xl font-semibold tabular-nums touch-manipulation sm:min-h-28 sm:text-6xl md:text-6xl [&>span]:justify-center [&>span]:text-center",
															fieldState.error &&
																"border-destructive focus:ring-destructive",
														)}
													>
														<SelectValue
															placeholder={
																t("waitlist_party_children") || "Children"
															}
														/>
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{WAITLIST_CHILD_COUNT_OPTIONS.map((n) => (
														<SelectItem key={n} value={String(n)}>
															{n}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{waitlistRequirePhone
												? t("waitlist_phone_required_label")
												: t("waitlist_phone") ||
													"Phone (optional, for notification)"}
											{waitlistRequirePhone ? (
												<span className="text-destructive"> *</span>
											) : null}
										</FormLabel>
										<FormControl>
											<Input
												type="tel"
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												placeholder={
													waitlistRequirePhone
														? t("phone_placeholder")
														: t("waitlist_phone_placeholder") || "Optional"
												}
												disabled={isSubmitting || !waitlistAcceptingJoins}
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								className="w-full h-10 sm:h-9 touch-manipulation"
								disabled={
									isSubmitting ||
									!form.formState.isValid ||
									!waitlistAcceptingJoins
								}
							>
								{isSubmitting
									? t("waitlist_joining") || "Joining..."
									: t("waitlist_join_button") || "Join waitlist"}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</Container>
	);
}
