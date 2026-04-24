"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import LineLoginButton from "@/components/auth/button-line-login";
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
import { authClient } from "@/lib/auth-client";
import {
	clearWaitlistFormDraft,
	getSavedPhoneFromFormPhoneOtp,
	loadWaitlistFormDraft,
	saveWaitlistFormDraft,
	WAITLIST_ADULT_COUNT_OPTIONS,
	WAITLIST_CHILD_COUNT_OPTIONS,
} from "@/lib/store/waitlist/waitlist-local-storage";
import { cn } from "@/lib/utils";
import { useResolvedCustomerStoreBasePath } from "@/providers/customer-store-base-path";
import { useI18n } from "@/providers/i18n-provider";
import { WaitListStatus } from "@/types/waitlist-status";
import { startRepeatingWaitlistCalledBell } from "@/utils/waitlist-called-bell";

export interface LiffWaitlistSettingsProps {
	enabled: boolean;
	requireSignIn: boolean;
	requireName: boolean;
	requirePhone: boolean;
	requireLineOnly: boolean;
}

interface LiffWaitlistClientProps {
	storeId: string;
	storeName: string;
	waitListSettings: LiffWaitlistSettingsProps | null;
	isSignedIn: boolean;
	/** True when the signed-in user has a Better Auth `Account` with `providerId === "line"`. */
	hasLineLinkedAccount: boolean;
	/** Where to return after sign-in (canonical: `/liff/waitlist?storeId=…`). */
	signInCallbackPath?: string;
}

export function LiffWaitlistClient({
	storeId,
	storeName,
	waitListSettings,
	isSignedIn,
	hasLineLinkedAccount,
	signInCallbackPath,
}: LiffWaitlistClientProps) {
	const signInReturn =
		signInCallbackPath ??
		`/liff/waitlist?storeId=${encodeURIComponent(storeId)}`;
	const signInHref = `/signIn?callbackUrl=${encodeURIComponent(signInReturn)}`;
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const customerBasePath = useResolvedCustomerStoreBasePath(storeId);
	const isHydrated = useIsHydrated();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [joined, setJoined] = useState<{
		id: string;
		verificationCode: string;
		queueNumber: number;
	} | null>(null);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [calledAckDialogOpen, setCalledAckDialogOpen] = useState(false);
	const [isCancellingWaitlist, setIsCancellingWaitlist] = useState(false);
	const [positionLoading, setPositionLoading] = useState(false);
	const [position, setPosition] = useState<{
		ahead: number;
		waitingInSession: number;
		status: string | null;
		queueNumber?: number;
	} | null>(null);

	const requireName = Boolean(waitListSettings?.requireName);
	const requirePhone = Boolean(waitListSettings?.requirePhone);
	const requireSignIn = Boolean(waitListSettings?.requireSignIn);
	const requireLineOnly = Boolean(waitListSettings?.requireLineOnly);

	const schema = useMemo(
		() => buildCreateWaitlistEntrySchema(requireName, requirePhone),
		[requireName, requirePhone],
	);

	const form = useForm<CreateWaitlistEntryInput>({
		// Zod 4 / refined union: @hookform/resolvers input typing vs FieldValues; runtime is correct
		resolver: zodResolver(schema as any) as Resolver<CreateWaitlistEntryInput>,
		defaultValues: {
			storeId,
			numOfAdult: 1,
			numOfChild: 0,
			name: null,
			lastName: null,
			phone: null,
			customerId: null,
		},
		mode: "onChange",
	});

	const { reset, watch } = form;
	const { data: sessionPayload } = authClient.useSession();
	const sessionUser = sessionPayload?.user as
		| { id?: string; name?: string | null; phoneNumber?: string | null }
		| undefined;
	const sessionUserId = sessionUser?.id;
	const sessionName = sessionUser?.name ?? null;
	const sessionPhone = sessionUser?.phoneNumber ?? null;

	useEffect(() => {
		if (!isHydrated || joined) {
			return;
		}

		const draft = loadWaitlistFormDraft(storeId);

		const next: CreateWaitlistEntryInput = {
			storeId,
			numOfAdult: draft?.numOfAdult ?? 1,
			numOfChild: draft?.numOfChild ?? 0,
			name: null,
			lastName: null,
			phone: null,
			customerId: null,
		};

		if (sessionUserId) {
			const nameFromSession = sessionName?.trim() || null;
			const phoneFromSession = sessionPhone?.trim() || null;
			next.name = nameFromSession ?? draft?.name ?? null;
			next.phone = phoneFromSession ?? draft?.phone ?? null;
			next.numOfAdult = draft?.numOfAdult ?? 1;
			next.numOfChild = draft?.numOfChild ?? 0;
		} else if (draft) {
			next.name = draft.name ?? null;
			next.phone = draft.phone ?? null;
			next.numOfAdult = draft.numOfAdult ?? 1;
			next.numOfChild = draft.numOfChild ?? 0;
		}

		reset(next);
	}, [
		isHydrated,
		joined,
		sessionUserId,
		sessionName,
		sessionPhone,
		storeId,
		reset,
	]);

	useEffect(() => {
		if (!isHydrated || joined) {
			return;
		}
		const current = form.getValues("phone");
		if (current?.trim()) {
			return;
		}
		const saved = getSavedPhoneFromFormPhoneOtp();
		if (saved) {
			form.setValue("phone", saved);
		}
	}, [isHydrated, joined, form]);

	const watchedName = watch("name");
	const watchedPhone = watch("phone");
	const watchedAdults = watch("numOfAdult");
	const watchedChildren = watch("numOfChild");

	useEffect(() => {
		if (joined) {
			return;
		}
		if (typeof window === "undefined") {
			return;
		}
		const id = window.setTimeout(() => {
			saveWaitlistFormDraft(storeId, {
				name: watchedName,
				phone: watchedPhone,
				numOfAdult: Number(watchedAdults) || 1,
				numOfChild: Number(watchedChildren) || 0,
			});
		}, 450);
		return () => window.clearTimeout(id);
	}, [
		joined,
		storeId,
		watchedName,
		watchedPhone,
		watchedAdults,
		watchedChildren,
	]);

	const onJoin = async (data: CreateWaitlistEntryInput) => {
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
			const entry = result?.data?.entry as
				| {
						id: string;
						verificationCode: string;
						queueNumber?: number;
				  }
				| undefined;
			if (
				!entry?.id ||
				!entry?.verificationCode ||
				typeof entry.queueNumber !== "number"
			) {
				toastError({
					title: t("waitlist_join_error") || "Error",
					description: t("waitlist_join_failed") || "Failed to join",
				});
				return;
			}
			setJoined({
				id: entry.id,
				verificationCode: entry.verificationCode,
				queueNumber: entry.queueNumber,
			});
			clearWaitlistFormDraft(storeId);
			toastSuccess({
				description:
					(t("waitlist_joined") || "You're on the list!") +
					" " +
					(t("waitlist_show_code_to_staff") ||
						"Show your code to staff when your number is called."),
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const refreshQueuePosition = useCallback(async () => {
		if (!joined) return;
		setPositionLoading(true);
		try {
			const result = await getWaitlistQueuePositionAction({
				storeId,
				waitlistId: joined.id,
				verificationCode: joined.verificationCode,
			});
			if (result?.serverError) {
				toastError({
					title: t("waitlist_join_error") || "Error",
					description: result.serverError,
				});
				return;
			}
			const d = result?.data;
			if (!d?.ok) {
				setPosition(null);
				toastError({
					title: t("waitlist_join_error") || "Error",
					description: t("waitlist_entry_not_found") || "Entry not found",
				});
				return;
			}
			setPosition({
				ahead: d.ahead,
				waitingInSession: d.waitingInSession,
				status: d.status,
				queueNumber: d.queueNumber,
			});
		} finally {
			setPositionLoading(false);
		}
	}, [joined, storeId, t]);

	const initialPositionFetchedFor = useRef<string | null>(null);
	const prevQueueStatusRef = useRef<string | null>(null);
	const prevJoinedIdForBellRef = useRef<string | null>(null);
	const calledBellStopRef = useRef<(() => void) | null>(null);
	const waitlistPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
		if (!joined) {
			initialPositionFetchedFor.current = null;
			return;
		}
		if (initialPositionFetchedFor.current === joined.id) {
			return;
		}
		initialPositionFetchedFor.current = joined.id;
		void refreshQueuePosition();
	}, [joined, refreshQueuePosition]);

	useEffect(() => {
		if (!joined) {
			if (waitlistPollRef.current) {
				clearInterval(waitlistPollRef.current);
				waitlistPollRef.current = null;
			}
			return;
		}
		void refreshQueuePosition();
		waitlistPollRef.current = setInterval(() => {
			void refreshQueuePosition();
		}, 12_000);
		return () => {
			if (waitlistPollRef.current) {
				clearInterval(waitlistPollRef.current);
				waitlistPollRef.current = null;
			}
		};
	}, [joined, refreshQueuePosition]);

	useEffect(() => {
		if (!joined) {
			calledBellStopRef.current?.();
			calledBellStopRef.current = null;
			setCalledAckDialogOpen(false);
			prevQueueStatusRef.current = null;
			prevJoinedIdForBellRef.current = null;
			return;
		}
		if (prevJoinedIdForBellRef.current !== joined.id) {
			prevJoinedIdForBellRef.current = joined.id;
			prevQueueStatusRef.current = null;
		}
		const queueStatus = position?.status ?? null;
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
		}
	}, [joined, position?.status]);

	const handleCancelMyWaitlist = useCallback(async () => {
		if (!joined) return;
		setIsCancellingWaitlist(true);
		try {
			const result = await cancelMyWaitlistEntryAction({
				storeId,
				waitlistId: joined.id,
				verificationCode: joined.verificationCode,
			});
			if (result?.serverError) {
				toastError({
					title: t("waitlist_join_error") || "Error",
					description: result.serverError,
				});
				return;
			}
			toastSuccess({
				description: t("waitlist_cancel_my_wait_success"),
			});
			setJoined(null);
			setPosition(null);
			setCancelDialogOpen(false);
			setCalledAckDialogOpen(false);
			calledBellStopRef.current?.();
			calledBellStopRef.current = null;
		} finally {
			setIsCancellingWaitlist(false);
		}
	}, [joined, storeId, t]);

	if (!waitListSettings?.enabled) {
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
				<Button className="mt-4" variant="outline" asChild>
					<Link href={`/s/${storeId}`}>
						{t("s_reservation_back_to_shop") || "Shop"}
					</Link>
				</Button>
			</Container>
		);
	}

	if ((requireSignIn || requireLineOnly) && !isSignedIn) {
		const href = requireLineOnly ? `${signInHref}&lineOnly=1` : signInHref;
		return (
			<Container className="py-10">
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">{storeName}</CardTitle>
						<CardDescription>
							{t("waitlist_sign_in_required") ||
								"Please sign in to join the waitlist."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button className="w-full touch-manipulation" asChild>
							<Link href={href}>{t("sign_in") || "Sign in"}</Link>
						</Button>
					</CardContent>
				</Card>
			</Container>
		);
	}

	if (requireLineOnly && isSignedIn && !hasLineLinkedAccount) {
		return (
			<Container className="py-10">
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">{storeName}</CardTitle>
						<CardDescription>
							{t("waitlist_line_link_cta") ||
								"This store requires a linked LINE account to join the waitlist."}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<LineLoginButton
							callbackUrl={signInReturn}
							className="h-10 w-full touch-manipulation sm:h-9"
						/>
						<Button
							variant="outline"
							className="w-full touch-manipulation"
							asChild
						>
							<Link href={`/s/${storeId}`}>
								{t("s_reservation_back_to_shop") || "Shop"}
							</Link>
						</Button>
					</CardContent>
				</Card>
			</Container>
		);
	}

	const joinedTicket = joined ? (
		<>
			{(() => {
				const displayQueueNumber = position?.queueNumber ?? joined.queueNumber;
				const queueStatus = position?.status ?? null;
				const ahead = position?.ahead ?? null;
				const waitingInSession = position?.waitingInSession ?? null;
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
								Math.round(
									((waitingInSession - ahead) / waitingInSession) * 100,
								),
							)
						: queueStatus === WaitListStatus.waiting
							? 0
							: 100;

				const canLeaveWaitlist =
					queueStatus === null || queueStatus === WaitListStatus.waiting;

				return (
					<Card>
						<CardHeader className="text-center">
							<CardTitle className="text-base font-medium text-muted-foreground sm:text-lg">
								{t("waitlist_your_queue_number") || "Your queue number"}
							</CardTitle>
							<div
								className="mt-3 text-7xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:mt-4 sm:text-8xl md:text-9xl md:leading-none"
								role="status"
								aria-label={
									t("waitlist_you_are_number", {
										n: displayQueueNumber,
									}) || `You are number ${displayQueueNumber}`
								}
							>
								#{displayQueueNumber}
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
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
									{joined.verificationCode}
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
								<Link href={`${customerBasePath}/menu`}>
									<Button className="w-full">
										{t("waitlist_place_order") || "Place order while waiting"}
									</Button>
								</Link>
								<Button
									type="button"
									variant="outline"
									className="w-full touch-manipulation"
									disabled={positionLoading}
									onClick={() => void refreshQueuePosition()}
								>
									{positionLoading
										? `${t("waitlist_refresh_position") ?? "Refresh position"}…`
										: (t("waitlist_refresh_position") ?? "Refresh position")}
								</Button>
								{canLeaveWaitlist && (
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
				);
			})()}

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
		</>
	) : null;

	return (
		<Container className="py-10">
			{!joined ? (
				<Card>
					<CardHeader>
						<CardTitle>{t("waitlist_title") || "Join the waitlist"}</CardTitle>
						<CardDescription>
							{t("waitlist_subtitle", { storeName }) ||
								`Join the queue at ${storeName}.`}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onJoin)} className="space-y-4">
								{requireName && (
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
													{t("waitlist_name_required_label") || "Name"}
													{requireName ? (
														<span className="text-destructive"> *</span>
													) : null}
												</FormLabel>
												<FormControl>
													<Input
														autoComplete="name"
														className={cn(
															"h-10 text-base sm:h-9 sm:text-sm touch-manipulation",
															fieldState.error &&
																"border-destructive focus-visible:ring-destructive",
														)}
														placeholder={
															t("waitlist_name_placeholder") || "Your name"
														}
														disabled={isSubmitting}
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
													disabled={isSubmitting}
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
													disabled={isSubmitting}
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
												{requirePhone
													? t("waitlist_phone_required_label")
													: t("waitlist_phone") ||
														"Phone (optional, for notification)"}
												{requirePhone ? (
													<span className="text-destructive"> *</span>
												) : null}
											</FormLabel>
											<FormControl>
												<Input
													type="tel"
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													placeholder={
														requirePhone
															? t("phone_placeholder")
															: t("waitlist_phone_placeholder") || "Optional"
													}
													disabled={isSubmitting}
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
									className="h-10 w-full touch-manipulation sm:h-9"
									disabled={
										isSubmitting ||
										!form.formState.isValid ||
										form.formState.isSubmitting
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
			) : (
				joinedTicket
			)}
		</Container>
	);
}
