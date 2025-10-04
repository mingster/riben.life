import { stripe } from "@better-auth/stripe";
import { betterAuth, BetterAuthOptions, OAuth2Tokens } from "better-auth";
import {
    admin,
    apiKey,
    bearer,
    magicLink,
    organization,
    twoFactor,
    //genericOAuth,
    captcha,
} from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { emailHarmony } from "better-auth-harmony";

//import { sendAuthMagicLink } from "@/actions/mail/send-auth-magic-link";
//import { sendAuthPasswordReset } from "@/actions/mail/send-auth-password-reset";
//import { sendAuthEmailValidation } from "@/actions/mail/send-auth-email-validation";
import { stripe as stripeClient } from "@/lib/stripe/config";
import { customSession } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sqlClient } from "./prismadb";

const options = {
    //...config options
    plugins: [],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
    database: prismaAdapter(sqlClient, {
        provider: "postgresql",
    }),
    session: {
        expiresIn: 60 * 60 * 24 * 365, // 365 days
        updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    },
    account: {
        accountLinking: {
            enabled: true,
            allowDifferentEmails: true,
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        account: {
            accountLinking: {
                enabled: true,
            },
        },
        sendResetPassword: async ({ user, url, token }, request) => {
            //await sendAuthPasswordReset(user.email, url);
        },
    },
    /* 
    emailVerification: {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            await sendAuthEmailValidation(user.email, url);
        },
    },
  */
    socialProviders: {
        google: {
            clientId: process.env.AUTH_GOOGLE_ID as string,
            clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
            accessType: "offline",
            prompt: "select_account consent",
        },

        discord: {
            clientId: process.env.AUTH_DISCORD_ID!,
            clientSecret: process.env.AUTH_DISCORD_SECRET!,
        },
        facebook: {
            clientId: process.env.AUTH_FACEBOOK_ID!,
            clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
        },
        line: {
            clientId: process.env.AUTH_LINE_ID!,
            clientSecret: process.env.AUTH_LINE_SECRET!,
        },
    },
    plugins: [
        ...(options.plugins ?? []),
        customSession(async ({ user, session }, ctx) => {
            // Include role and other user fields in the session
            const typedUser = user as any;
            const typedSession = session as any;

            return {
                user: {
                    ...typedUser,
                    role: typedUser?.role || "user", // Ensure role is always present
                },
                session: {
                    ...typedSession,
                    user: {
                        ...typedSession?.user,
                        role: typedUser?.role || "user", // Include role in session.user
                    },
                },
            };
        }, options),
        stripe({
            stripeClient,
            stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET as string,
            createCustomerOnSignUp: false,
            enabled: true,
            plans: async () => {
                const setting = await sqlClient.platformSettings.findFirst();
                if (!setting) {
                    return [];
                }

                const pricesResponse = await stripeClient.prices
                    .list({
                        product: setting.stripeProductId as string,
                    })
                    .then((obj) => {
                        return obj.data.map((price) => ({
                            name: price.nickname,
                            priceId: price.id,
                            //limits: JSON.parse(price.metadata.limits),
                            freeTrial: {
                                days: price.metadata.freeTrial,
                            },
                            active: price.active,
                            lookup_key: price.lookup_key,
                            group: price.metadata.group,
                        }));
                    });
            },
        }),
        twoFactor(),
        magicLink({
            sendMagicLink: async ({ email, url, token }, request) => {
                //await sendAuthMagicLink(email, url);
            },
            expiresIn: 60 * 60 * 24, // 24 hours
        }),
        bearer(),
        passkey(),
        apiKey(),
        emailHarmony(),
        /*
        captcha({
            provider: "google-recaptcha", // or cloudflare-turnstile, hcaptcha
            secretKey: process.env.RECAPTCHA_SECRET_KEY as string,
        }),
        */
        organization(),
        admin({
            adminRoles: ["ADMIN"],
            //sysAdminUserIds: ["Nz6WKKKMKvadXXmgZgaHiqIYOuXr31w1"],
            //impersonationSessionDuration: 60 * 60 * 24, // 1 day
        }),
    ],
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "user",
                input: false, // don't allow user to set role
            },
            locale: {
                type: "string",
                required: false,
                defaultValue: "tw",
            },
            timezone: {
                type: "string",
                required: false,
                defaultValue: "",
            },
            stripeCustomerId: {
                type: "string",
                required: false,
                defaultValue: "",
            },
        },
    },
});
export type Session = typeof auth.$Infer.Session;
