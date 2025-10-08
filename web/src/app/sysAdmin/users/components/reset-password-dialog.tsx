"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconKey, IconLoader } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { setUserPasswordAction } from "@/actions/sysAdmin/user/reset-user-password";
import { toastError, toastSuccess } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import clientLogger from "@/lib/client-logger";
import type { User } from "@/types";

const setPasswordSchema = z
	.object({
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
				"Password must contain at least one uppercase letter, one lowercase letter, and one number",
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

type SetPasswordForm = z.infer<typeof setPasswordSchema>;

interface ResetPasswordDialogProps {
	user: User;
	children: React.ReactNode;
}

export function ResetPasswordDialog({
	user,
	children,
}: ResetPasswordDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<SetPasswordForm>({
		resolver: zodResolver(setPasswordSchema),
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
	});

	const onSubmit = async (data: SetPasswordForm) => {
		setIsLoading(true);

		clientLogger.logUserAction("admin_set_password_attempt", {
			metadata: {
				userId: user.id,
				userEmail: user.email,
			},
		});

		try {
			const result = await setUserPasswordAction({
				userId: user.id,
				newPassword: data.newPassword,
			});

			if (result?.serverError) {
				clientLogger.error("Admin set password failed", {
					metadata: {
						error: result.serverError,
						userId: user.id,
						userEmail: user.email,
					},
					tags: ["admin", "set-password", "error"],
				});

				toastError({
					title: "Set Password Failed",
					description: result.serverError,
				});
				return;
			}

			clientLogger.logUserAction("admin_set_password_success", {
				metadata: {
					userId: user.id,
					userEmail: user.email,
				},
			});

			toastSuccess({
				title: "Password Set Successfully",
				description: `The password for ${user.name} has been updated successfully.`,
			});

			setIsOpen(false);
			form.reset();
		} catch (error) {
			clientLogger.error("Admin set password error", {
				metadata: {
					error: error instanceof Error ? error.message : "Unknown error",
					userId: user.id,
					userEmail: user.email,
				},
				tags: ["admin", "set-password", "error"],
			});

			toastError({
				title: "Set Password Error",
				description: "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconKey className="h-5 w-5" />
						Set User Password
					</DialogTitle>
					<DialogDescription>
						Set a new password for the user. This will immediately update their
						password.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground">
								<strong>User:</strong> {user.name}
							</p>
							<p className="text-sm text-muted-foreground">
								<strong>Email:</strong> {user.email || "No email set"}
							</p>
						</div>

						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="password"
											placeholder="Enter new password"
											disabled={isLoading}
										/>
									</FormControl>
									<FormMessage />
									<p className="text-xs text-muted-foreground">
										Password must be at least 8 characters with uppercase,
										lowercase, and number.
									</p>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm Password</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="password"
											placeholder="Confirm new password"
											disabled={isLoading}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsOpen(false)}
								disabled={isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading ? (
									<>
										<IconLoader className="mr-2 h-4 w-4 animate-spin" />
										Setting Password...
									</>
								) : (
									<>
										<IconKey className="mr-2 h-4 w-4" />
										Set Password
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
