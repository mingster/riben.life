import { readFile } from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getT } from "@/app/i18n";

export const revalidate = 3600;

async function loadHelpMarkdown(fallback: string): Promise<string> {
	const file = path.join(process.cwd(), "src/content/shop-help.md");
	try {
		return await readFile(file, "utf8");
	} catch {
		return fallback;
	}
}

export default async function ShopHelpPage() {
	const { t } = await getT(undefined, "shop");
	const markdown = await loadHelpMarkdown(t("shop_help_fallback_markdown"));

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-light prose-p:text-muted-foreground prose-li:text-muted-foreground">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
			</div>
		</div>
	);
}
