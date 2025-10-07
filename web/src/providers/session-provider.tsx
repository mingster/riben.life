"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useTranslation } from "@/app/i18n/client";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";

export function SessionWrapper({ children }: { children: ReactNode }) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<AuthUIProvider
			authClient={authClient}
			navigate={router.push}
			replace={router.replace}
			onSessionChange={() => {
				// Clear router cache (protected routes)
				router.refresh();
			}}
			Link={Link}
			social={{
				providers: ["google", "line" /*"facebook", "apple", "discord"*/],
			}}
			/*
			captcha={{
				provider: "google-recaptcha-v3",
				siteKey: process.env.NEXT_PUBLIC_RECAPTCHA as string,
				endpoints: ["/sign-up/email", "/sign-in/email", "/forget-password"],
			}}
			*/
			multiSession
			magicLink
			passkey
			twoFactor={["otp", "totp"]}
			localization={{
				SIGN_IN: t("signin"),
				SIGN_IN_DESCRIPTION: t("signin_description"),
				SIGN_UP: t("signup"),
				FORGOT_PASSWORD: t("forgot_password"),
				PASSWORD_PLACEHOLDER: t("password_placeholder"),
				MAGIC_LINK_EMAIL: t("magic_link_email"),
				FORGOT_PASSWORD_EMAIL: t("forgot_password_email"),
				RESET_PASSWORD_SUCCESS: t("reset_password_success"),
				PROVIDERS: t("providers"),
				PROVIDERS_DESCRIPTION: t("providers_description"),

				PASSKEY: t("passkey"),
				PASSKEYS: t("passkeys"),
				ADD_PASSKEY: t("add_passkey"),
				PASSKEYS_DESCRIPTION: t("passkeys_description"),
				PASSKEYS_INSTRUCTIONS: t("passkeys_instructions"),
				CHALLENGE_NOT_FOUND: t("challenge_not_found"),
				YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY: t(
					"you_are_not_allowed_to_register_this_passkey",
				),
				FAILED_TO_VERIFY_REGISTRATION: t("failed_to_verify_registration"),
				PASSKEY_NOT_FOUND: t("passkey_not_found"),
				AUTHENTICATION_FAILED: t("authentication_failed"),
				UNABLE_TO_CREATE_SESSION: t("unable_to_create_session"),
				FAILED_TO_UPDATE_PASSKEY: t("failed_to_update_passkey"),

				UNLINK: t("unlink"),
				LINK: t("link"),
				TWO_FACTOR: t("two_factor"),
				TWO_FACTOR_ACTION: t("two_factor_action"),
				TWO_FACTOR_DESCRIPTION: t("two_factor_description"),
				TWO_FACTOR_CARD_DESCRIPTION: t("two_factor_card_description"),
				TWO_FACTOR_DISABLE_INSTRUCTIONS: t("two_factor_disable_instructions"),
				TWO_FACTOR_ENABLE_INSTRUCTIONS: t("two_factor_enable_instructions"),
				TWO_FACTOR_ENABLED: t("two_factor_enabled"),
				TWO_FACTOR_DISABLED: t("two_factor_disabled"),
				TWO_FACTOR_PROMPT: t("two_factor_prompt"),
				TWO_FACTOR_TOTP_LABEL: t("two_factor_totp_label"),
				ENABLE_TWO_FACTOR: t("enable_two_factor"),
				CANCEL: t("cancel"),
				PASSWORD: t("password"),
				API_KEYS: t("api_keys"),
				API_KEYS_DESCRIPTION: t("api_keys_description"),
				API_KEYS_INSTRUCTIONS: t("api_keys_instructions"),
				CREATE_API_KEY: t("create_api_key"),
				CREATE_API_KEY_DESCRIPTION: t("create_api_key_description"),
				API_KEY_NAME_PLACEHOLDER: t("api_key_name_placeholder"),
				API_KEY_CREATED: t("api_key_created"),
				CREATE_API_KEY_SUCCESS: t("create_api_key_success"),
				DELETE_API_KEY: t("delete_api_key"),
				DELETE_API_KEY_CONFIRM: t("delete_api_key_confirm"),
				DELETE: t("delete"),

				EXPIRES: t("expires"),
				NAME: t("name"),
				EMAIL: t("email"),
				EMAIL_DESCRIPTION: t("email_description"),
				EMAIL_INSTRUCTIONS: t("email_instructions"),
				EMAIL_IS_THE_SAME: t("email_is_the_same"),
				EMAIL_PLACEHOLDER: t("email_placeholder"),
				EMAIL_REQUIRED: t("email_required"),
				EMAIL_VERIFY_CHANGE: t("email_verify_change"),
				EMAIL_VERIFICATION: t("email_verification"),
				SAVE: t("save"),
				DELETE_ACCOUNT: t("delete_account"),
				DELETE_ACCOUNT_DESCRIPTION: t("delete_account_description"),
				DELETE_ACCOUNT_INSTRUCTIONS: t("delete_account_instructions"),
				DELETE_ACCOUNT_VERIFY: t("delete_account_verify"),
				DELETE_ACCOUNT_SUCCESS: t("delete_account_success"),
				DISABLE_TWO_FACTOR: t("disable_two_factor"),

				CHANGE_PASSWORD: t("change_password"),
				CHANGE_PASSWORD_DESCRIPTION: t("change_password_description"),
				CURRENT_PASSWORD: t("current_password"),
				NEW_PASSWORD: t("new_password"),
				CHANGE_PASSWORD_SUCCESS: t("change_password_success"),
				SET_PASSWORD: t("set_password"),
				SET_PASSWORD_DESCRIPTION: t("set_password_description"),
				PASSWORD_REQUIRED: t("password_required"),
				OR_CONTINUE_WITH: "",
				SIGN_UP_DESCRIPTION: t("sign_up_description"),
				ALREADY_HAVE_AN_ACCOUNT: t("already_have_an_account"),
			}}
		>
			{children}
		</AuthUIProvider>
	);
}
