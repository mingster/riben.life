import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Heuristic: legacy product copy stored as HTML (rich text / paste from web). */
function looksLikeLegacyHtml(s: string): boolean {
	const t = s.trim();
	if (!t.startsWith("<")) {
		return false;
	}
	return /<\/[a-z][\w-]*>/i.test(t) || /<[a-z][\w-]*(?:\s|>)/i.test(t);
}

interface ProductDescriptionContentProps {
	/** Markdown (preferred) or legacy HTML. */
	content: string;
	className?: string;
}

/**
 * Renders store product description: Markdown via react-markdown; legacy HTML
 * still supported for older rows saved as HTML.
 */
export function ProductDescriptionContent({
	content,
	className = "prose prose-sm dark:prose-invert mt-4 max-w-none text-muted-foreground",
}: ProductDescriptionContentProps) {
	if (looksLikeLegacyHtml(content)) {
		return (
			<div
				className={className}
				dangerouslySetInnerHTML={{ __html: content }}
			/>
		);
	}

	return (
		<div className={className}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</div>
	);
}
