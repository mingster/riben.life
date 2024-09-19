import "../../css/font.css";
import "../../css/base.css";
import "../../css/utilities.css";

import { redirect } from "next/navigation";
import { signIn, auth, providerMap } from "@/auth";
import { AuthError } from "next-auth";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaLine } from "react-icons/fa";

import { useTranslation } from "@/app/i18n";
import { useI18n } from "@/providers/i18n-provider";

const SIGNIN_ERROR_URL = "/signin-error";

export default async function SignInPage(props: {
  searchParams: { callbackUrl: string | undefined };
}) {
  const { t } = await useTranslation("tw");

  return (
    <section className="px-8 mt-20 text-center sm:mt-32 md:mt-40">
      <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
        {t("signin")}
      </h2>

      {Object.values(providerMap).map((provider) => (
        <form
          key={provider.id}
          action={async () => {
            "use server";
            try {
              await signIn(provider.id, {
                redirectTo: props.searchParams?.callbackUrl ?? "",
              });
            } catch (error) {
              // Signin can fail for a number of reasons, such as the user
              // not existing, or the user not having the correct role.
              // In some cases, you may want to redirect to a custom error
              if (error instanceof AuthError) {
                return redirect(`${SIGNIN_ERROR_URL}?error=${error.type}`);
              }

              // Otherwise if a redirects happens Next.js can handle it
              // so you can just re-thrown the error and let Next.js handle it.
              // Docs:
              // https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
              throw error;
            }
          }}
        >
          <Button type="submit" className="w-full mt-4 px-4 py-2">
            <span className="mr-2 flex items-center justify-center">
              {(() => {
                switch (provider.name.toLowerCase()) {
                  case "google":
                    return <FcGoogle className="w-5 h-5" />;
                  case "facebook":
                    return <FaFacebook className="w-5 h-5" />;
                  case "line":
                    return <FaLine className="w-5 h-5" />;
                  default:
                    return null;
                }
              })()}
              {t("signin_with").replace("{0}", provider.name)}
            </span>
          </Button>
        </form>
      ))}
    </section>
  );
}
