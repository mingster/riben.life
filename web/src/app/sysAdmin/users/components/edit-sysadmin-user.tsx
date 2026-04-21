"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { updateUserAction } from "@/actions/sysAdmin/user/update-user";
import {
	type UpdateUserSettingsInput,
	updateUserSettingsSchema,
} from "@/actions/sysAdmin/user/user.validation";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { Role } from "@/types/enum";

/** Same values as Prisma `Role`; use here instead of `@prisma/client` in client code (Turbopack). */
const ROLE_OPTIONS = [
	Role.user,
	Role.owner,
	Role.staff,
	Role.storeAdmin,
	Role.admin,
] as const;

interface EditSysadminUserProps {
	user: {
		id: string;
		name: string | null;
		email: string | null;
		locale: string | null;
		timezone: string | null;
		role: string | null;
		banned: boolean | null;
		banReason: string | null;
	};
}

export function EditSysadminUser({ user }: EditSysadminUserProps) {
	const [loading, setLoading] = useState(false);

	const defaultValues: UpdateUserSettingsInput = {
		id: user.id,
		name: user.name ?? "",
		email: user.email ?? "",
		password: "",
		locale: user.locale ?? "",
		timezone: user.timezone ?? "Asia/Taipei",
		role: user.role ?? Role.user,
		stripeCustomerId: "",
		phoneNumber: "",
		phoneNumberVerified: false,
		image: "",
		twoFactorEnabled: false,
		banned: user.banned ?? false,
		banReason: user.banReason ?? "",
		banExpires: undefined,
	};

	const form = useForm<UpdateUserSettingsInput>({
		resolver: zodResolver(updateUserSettingsSchema),
		defaultValues,
		mode: "onChange",
	});

	async function onSubmit(data: UpdateUserSettingsInput) {
		setLoading(true);
		try {
			const result = await updateUserAction(data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: "User updated." });
		} finally {
			setLoading(false);
		}
	}

	const banned = form.watch("banned");

	return (
		<div className="relative max-w-lg space-y-4" aria-busy={loading}>
			{loading && (
				<div className="absolute inset-0 z-[100] flex cursor-wait items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
					<Loader />
				</div>
			)}
			<p className="text-muted-foreground text-sm">
				Email (read-only): {user.email ?? "—"}
			</p>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name *</FormLabel>
								<FormControl>
									<Input disabled={loading} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="role"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Role *</FormLabel>
								<Select
									disabled={loading}
									onValueChange={field.onChange}
									value={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Role" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{ROLE_OPTIONS.map((r) => (
											<SelectItem key={r} value={r}>
												{r}
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
						name="locale"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Locale</FormLabel>
								<FormControl>
									<Input
										disabled={loading}
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="timezone"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Timezone</FormLabel>
								<FormControl>
									<Input
										disabled={loading}
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="banned"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center gap-2 space-y-0">
								<FormControl>
									<Checkbox
										checked={Boolean(field.value)}
										onCheckedChange={(c) => field.onChange(c === true)}
										disabled={loading}
									/>
								</FormControl>
								<FormLabel>Banned</FormLabel>
							</FormItem>
						)}
					/>
					{banned && (
						<FormField
							control={form.control}
							name="banReason"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Ban reason *</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading}
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}
					<Button
						type="submit"
						disabled={loading || !form.formState.isValid}
						className="touch-manipulation"
					>
						Save
					</Button>
				</form>
			</Form>
		</div>
	);
}
