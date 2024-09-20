import "../../css/font.css";
import "../../css/base.css";
import "../../css/utilities.css";

import { auth, providerMap, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { FaFacebook, FaLine } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import { useTranslation } from "@/app/i18n";
import { Navbar } from "@/components/global-navbar";
import { useI18n } from "@/providers/i18n-provider";
import { Logo } from "@/components/Logo";

const SIGNIN_ERROR_URL = "/signin-error";

export default async function SignInPage(props: {
  searchParams: { callbackUrl: string | undefined };
}) {
  const { t } = await useTranslation("tw");

  return (
    <>
      <Navbar title="" />
      <section
        id="signin"
        className="flex justify-center items-center h-screen"
      >
        <div
          className="w-1/2 h-screen hidden lg:block
      bg-top bg-cover bg-no-repeat bg-[url('/images/beams/blog-post-form@80.jpg')]
      dark:bg-[url('/images/beams/blog-post-form-dark@90.jpg')]"
        >
          <div className="flex h-screen p-8 w-full text-center items-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-sky-200">
              <Logo className="w-auto" />
              登入來管理您的商店、訂單或帳號資訊。
            </h2>
          </div>
        </div>

        <div className="lg:p-36 md:p-52 sm:p-20 p-8 w-full lg:w-1/2 bg-transparent">
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
              <Button
                variant="outline"
                type="submit"
                className="w-full mt-4 px-4 py-2"
              >
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
                        return "";
                    }
                  })()}
                  {t("signin_with").replace("{0}", provider.name)}
                </span>
              </Button>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}
