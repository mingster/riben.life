"use client";

import { useTranslation } from "@/app/i18n/client";
import type { RunSysadminCronInput } from "@/actions/sysAdmin/cron/run-sysadmin-cron.validation";
import { runSysadminCronAction } from "@/actions/sysAdmin/cron/run-sysadmin-cron";
import { Heading } from "@/components/heading";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	CRON_JOB_DEFINITIONS,
	type CronJobDefinition,
	type CronJobId,
	type NotificationScheduleMode,
	type SendmailScheduleMode,
	type SyncDeliveryScheduleMode,
	generateCrontabBlock,
	getCronJobDefinition,
} from "@/lib/cron/cron-job-catalog";
import { useI18n } from "@/providers/i18n-provider";
import { IconCopy, IconPlayerPlay } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";

/** Client UI for SysAdmin cron runs and crontab generation. */
export function CronManagementClient() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [working, setWorking] = useState(false);
	const [lastResult, setLastResult] = useState<{
		jobId: CronJobId;
		httpStatus: number;
		durationMs: number;
		bodyPreview: string;
		truncated: boolean;
	} | null>(null);

	const [drafts, setDrafts] = useState<
		Record<CronJobId, Record<string, string>>
	>(() => {
		const initial: Record<CronJobId, Record<string, string>> = {} as Record<
			CronJobId,
			Record<string, string>
		>;
		for (const j of CRON_JOB_DEFINITIONS) {
			initial[j.id] = { ...j.defaultQuery };
		}
		return initial;
	});

	const [deployRoot, setDeployRoot] = useState("/var/www/riben.life/web");
	const [sendmailMode, setSendmailMode] =
		useState<SendmailScheduleMode>("single");
	const [notificationMode, setNotificationMode] =
		useState<NotificationScheduleMode>("single");
	const [syncDeliveryMode, setSyncDeliveryMode] =
		useState<SyncDeliveryScheduleMode>("every5");

	const crontabText = useMemo(
		() =>
			generateCrontabBlock({
				deployRoot,
				sendmailMode,
				notificationMode,
				syncDeliveryMode,
			}),
		[deployRoot, sendmailMode, notificationMode, syncDeliveryMode],
	);

	const buildRunPayload = useCallback(
		(jobId: CronJobId): RunSysadminCronInput => {
			const def = getCronJobDefinition(jobId);
			const q = drafts[jobId] ?? {};
			const base: RunSysadminCronInput = { jobId };

			if (def.supportsBatchSize && q.batchSize?.trim() !== "") {
				const n = Number.parseInt(q.batchSize, 10);
				if (!Number.isNaN(n)) base.batchSize = n;
			}
			if (def.supportsMaxConcurrent && q.maxConcurrent?.trim() !== "") {
				const n = Number.parseInt(q.maxConcurrent, 10);
				if (!Number.isNaN(n)) base.maxConcurrent = n;
			}
			if (def.supportsNotificationBatchSize && q.batchSize?.trim() !== "") {
				const n = Number.parseInt(q.batchSize, 10);
				if (!Number.isNaN(n)) base.notificationBatchSize = n;
			}
			if (def.supportsAgeMinutes && q.ageMinutes?.trim() !== "") {
				const n = Number.parseInt(q.ageMinutes, 10);
				if (!Number.isNaN(n)) base.ageMinutes = n;
			}

			return base;
		},
		[drafts],
	);

	const handleRun = useCallback(
		async (jobId: CronJobId) => {
			setWorking(true);
			try {
				const result = await runSysadminCronAction(buildRunPayload(jobId));
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				if (result?.data) {
					setLastResult(result.data);
					toastSuccess({ description: t("sysadmin_cron_run_complete") });
				}
			} catch (err: unknown) {
				toastError({
					description: err instanceof Error ? err.message : String(err),
				});
			} finally {
				setWorking(false);
			}
		},
		[buildRunPayload, t],
	);

	const copyText = useCallback(
		async (text: string) => {
			try {
				await navigator.clipboard.writeText(text);
				toastSuccess({ description: t("sysadmin_cron_copied") });
			} catch {
				toastError({ description: t("sysadmin_cron_copy_failed") });
			}
		},
		[t],
	);

	const updateDraft = useCallback(
		(jobId: CronJobId, field: string, value: string) => {
			setDrafts((prev) => ({
				...prev,
				[jobId]: { ...prev[jobId], [field]: value },
			}));
		},
		[],
	);

	return (
		<div
			className="relative space-y-6 px-3 sm:px-4 lg:px-6 py-4"
			aria-busy={working}
			aria-disabled={working}
		>
			{working && (
				<div
					className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
					aria-label={t("sysadmin_cron_working")}
				>
					<div className="flex flex-col items-center gap-3">
						<ClipLoader size={40} color="#3498db" />
						<span className="text-sm font-medium text-muted-foreground">
							{t("sysadmin_cron_working")}
						</span>
					</div>
				</div>
			)}

			<Heading
				title={t("sysadmin_cron_page_title")}
				description={t("sysadmin_cron_page_description")}
			/>

			<Card>
				<CardHeader>
					<CardTitle className="text-base sm:text-lg">
						{t("sysadmin_cron_section_run")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md border overflow-hidden">
						<div className="overflow-x-auto -mx-3 sm:mx-0">
							<Table className="min-w-[720px] sm:min-w-full">
								<TableHeader>
									<TableRow>
										<TableHead className="w-[140px]">
											{t("sysadmin_cron_col_job")}
										</TableHead>
										<TableHead>{t("sysadmin_cron_col_api_path")}</TableHead>
										<TableHead className="min-w-[200px]">
											{t("sysadmin_cron_col_overrides")}
										</TableHead>
										<TableHead className="hidden lg:table-cell max-w-[200px]">
											{t("sysadmin_cron_col_log_hint")}
										</TableHead>
										<TableHead className="w-[100px] text-end">
											{t("sysadmin_cron_col_actions")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{CRON_JOB_DEFINITIONS.map((job) => (
										<CronJobRow
											key={job.id}
											job={job}
											draft={drafts[job.id]}
											disabled={working}
											onDraftChange={(field, value) =>
												updateDraft(job.id, field, value)
											}
											onRun={() => handleRun(job.id)}
											t={t}
										/>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base sm:text-lg">
						{t("sysadmin_cron_section_output")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{lastResult ? (
						<>
							<div className="flex flex-wrap items-center gap-2 sm:gap-3">
								<Badge
									variant={
										lastResult.httpStatus >= 200 && lastResult.httpStatus < 300
											? "default"
											: "destructive"
									}
								>
									{t("sysadmin_cron_http_status")}: {lastResult.httpStatus}
								</Badge>
								<span className="text-sm text-muted-foreground">
									{t("sysadmin_cron_duration_ms")}: {lastResult.durationMs} ms
								</span>
								<span className="text-sm text-muted-foreground">
									{t("sysadmin_cron_last_job_label")}:{" "}
									<span className="font-mono">
										{t(
											getCronJobDefinition(lastResult.jobId)
												.labelTranslationKey,
										)}
									</span>
								</span>
								{lastResult.truncated && (
									<span className="text-xs text-amber-600 dark:text-amber-500">
										{t("sysadmin_cron_response_truncated")}
									</span>
								)}
							</div>
							<pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap break-all">
								{lastResult.bodyPreview}
							</pre>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="touch-manipulation"
									disabled={working}
									onClick={() => copyText(lastResult.bodyPreview)}
								>
									<IconCopy className="mr-2 h-4 w-4" />
									{t("sysadmin_cron_copy_output")}
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="touch-manipulation"
									disabled={working}
									onClick={() => setLastResult(null)}
								>
									{t("sysadmin_cron_clear_output")}
								</Button>
							</div>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							{t("sysadmin_cron_output_empty")}
						</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base sm:text-lg">
						{t("sysadmin_cron_section_crontab")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						{t("sysadmin_cron_host_logs_disclaimer")}
					</p>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="deploy-root">
								{t("sysadmin_cron_deploy_root")}
							</Label>
							<Input
								id="deploy-root"
								value={deployRoot}
								onChange={(e) => setDeployRoot(e.target.value)}
								disabled={working}
								className="h-10 text-base sm:text-sm font-mono touch-manipulation"
							/>
						</div>
						<div className="space-y-2">
							<Label>{t("sysadmin_cron_sendmail_mode")}</Label>
							<Select
								value={sendmailMode}
								onValueChange={(v) =>
									setSendmailMode(v as SendmailScheduleMode)
								}
								disabled={working}
							>
								<SelectTrigger className="h-10 sm:h-9 touch-manipulation">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="single">
										{t("sysadmin_cron_mode_single")}
									</SelectItem>
									<SelectItem value="stagger6">
										{t("sysadmin_cron_mode_stagger6")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>{t("sysadmin_cron_notification_mode")}</Label>
							<Select
								value={notificationMode}
								onValueChange={(v) =>
									setNotificationMode(v as NotificationScheduleMode)
								}
								disabled={working}
							>
								<SelectTrigger className="h-10 sm:h-9 touch-manipulation">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="single">
										{t("sysadmin_cron_mode_single")}
									</SelectItem>
									<SelectItem value="stagger6">
										{t("sysadmin_cron_mode_stagger6")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2 lg:col-span-4">
							<Label>{t("sysadmin_cron_sync_mode")}</Label>
							<Select
								value={syncDeliveryMode}
								onValueChange={(v) =>
									setSyncDeliveryMode(v as SyncDeliveryScheduleMode)
								}
								disabled={working}
							>
								<SelectTrigger className="h-10 sm:h-9 max-w-md touch-manipulation">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="every5">
										{t("sysadmin_cron_sync_every5")}
									</SelectItem>
									<SelectItem value="hourly">
										{t("sysadmin_cron_sync_hourly")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<Textarea
						readOnly
						value={crontabText}
						className="min-h-[220px] font-mono text-xs"
						aria-label={t("sysadmin_cron_section_crontab")}
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="touch-manipulation"
						disabled={working}
						onClick={() => copyText(crontabText)}
					>
						<IconCopy className="mr-2 h-4 w-4" />
						{t("sysadmin_cron_copy_crontab")}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

interface CronJobRowProps {
	job: CronJobDefinition;
	draft: Record<string, string> | undefined;
	disabled: boolean;
	onDraftChange: (field: string, value: string) => void;
	onRun: () => void;
	t: (key: string) => string;
}

function CronJobRow({
	job,
	draft,
	disabled,
	onDraftChange,
	onRun,
	t,
}: CronJobRowProps) {
	const q = draft ?? {};

	return (
		<TableRow>
			<TableCell className="font-medium align-top">
				{t(job.labelTranslationKey)}
			</TableCell>
			<TableCell className="align-top">
				<code className="text-xs font-mono break-all">{job.apiPath}</code>
			</TableCell>
			<TableCell className="align-top">
				<OverrideFields
					job={job}
					q={q}
					disabled={disabled}
					onDraftChange={onDraftChange}
					t={t}
				/>
			</TableCell>
			<TableCell className="hidden lg:table-cell align-top text-xs text-muted-foreground font-mono break-all max-w-[200px]">
				{job.logFileHint}
			</TableCell>
			<TableCell className="text-end align-top">
				<Button
					type="button"
					size="sm"
					className="h-10 sm:h-9 touch-manipulation"
					disabled={disabled}
					onClick={onRun}
				>
					<IconPlayerPlay className="mr-1.5 h-4 w-4" />
					{t("sysadmin_cron_run")}
				</Button>
			</TableCell>
		</TableRow>
	);
}

function OverrideFields({
	job,
	q,
	disabled,
	onDraftChange,
	t,
}: {
	job: CronJobDefinition;
	q: Record<string, string>;
	disabled: boolean;
	onDraftChange: (field: string, value: string) => void;
	t: (key: string) => string;
}) {
	if (
		!job.supportsBatchSize &&
		!job.supportsMaxConcurrent &&
		!job.supportsNotificationBatchSize &&
		!job.supportsAgeMinutes
	) {
		return <span className="text-xs text-muted-foreground">—</span>;
	}

	return (
		<div className="flex flex-col gap-2">
			{job.supportsBatchSize && (
				<div className="flex flex-col gap-1">
					<Label className="text-xs text-muted-foreground">
						{t("sysadmin_cron_batch_size")}
					</Label>
					<Input
						type="number"
						min={1}
						value={q.batchSize ?? ""}
						onChange={(e) => onDraftChange("batchSize", e.target.value)}
						disabled={disabled}
						className={cn(
							"h-9 text-base sm:text-sm max-w-[120px] touch-manipulation",
						)}
					/>
				</div>
			)}
			{job.supportsMaxConcurrent && (
				<div className="flex flex-col gap-1">
					<Label className="text-xs text-muted-foreground">
						{t("sysadmin_cron_max_concurrent")}
					</Label>
					<Input
						type="number"
						min={1}
						value={q.maxConcurrent ?? ""}
						onChange={(e) => onDraftChange("maxConcurrent", e.target.value)}
						disabled={disabled}
						className="h-9 text-base sm:text-sm max-w-[120px] touch-manipulation"
					/>
				</div>
			)}
			{job.supportsNotificationBatchSize && (
				<div className="flex flex-col gap-1">
					<Label className="text-xs text-muted-foreground">
						{t("sysadmin_cron_notification_batch")}
					</Label>
					<Input
						type="number"
						min={1}
						value={q.batchSize ?? ""}
						onChange={(e) => onDraftChange("batchSize", e.target.value)}
						disabled={disabled}
						className="h-9 text-base sm:text-sm max-w-[120px] touch-manipulation"
					/>
				</div>
			)}
			{job.supportsAgeMinutes && (
				<div className="flex flex-col gap-1">
					<Label className="text-xs text-muted-foreground">
						{t("sysadmin_cron_age_minutes")}
					</Label>
					<Input
						type="number"
						min={1}
						value={q.ageMinutes ?? ""}
						onChange={(e) => onDraftChange("ageMinutes", e.target.value)}
						disabled={disabled}
						className="h-9 text-base sm:text-sm max-w-[120px] touch-manipulation"
					/>
				</div>
			)}
		</div>
	);
}
