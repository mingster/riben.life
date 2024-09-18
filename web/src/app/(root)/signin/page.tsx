import "../../css/font.css";
import "../../css/base.css";
import "../../css/utilities.css";

//export default async function Page({ host }: { host: string }) {
export default function CustomSignInPage() {
  return (
    <section className="px-8 mt-20 text-center sm:mt-32 md:mt-40">
      <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
        Sign in
      </h2>
    </section>
  );
}
