"use client";

import type { ContextStore } from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback } from "react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type MdOnChange = (
	value?: string,
	event?: React.ChangeEvent<HTMLTextAreaElement>,
	state?: ContextStore,
) => void;

export interface MarkdownMdxEditorProps {
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	name?: string;
	disabled?: boolean;
	placeholder?: string;
	/** Min height of the editor area (px). */
	minHeight?: number;
}

/**
 * Markdown editor with live preview (@uiw/react-md-editor).
 * Stored value is Markdown/Markdown-compatible MDX-ish text (same pipeline as product descriptions).
 */
export function MarkdownMdxEditor({
	value,
	onChange,
	onBlur,
	name,
	disabled,
	placeholder,
	minHeight = 320,
}: MarkdownMdxEditorProps) {
	const { theme } = useTheme();

	const handleChange = useCallback<MdOnChange>(
		(v) => {
			onChange(v ?? "");
		},
		[onChange],
	);

	return (
		<div
			data-color-mode={theme === "dark" ? "dark" : "light"}
			className={
				disabled
					? "wmde-markdown-var pointer-events-none rounded-md border border-input bg-background opacity-60 overflow-hidden"
					: "wmde-markdown-var rounded-md border border-input bg-background overflow-hidden"
			}
		>
			<MDEditor
				value={value}
				onChange={handleChange}
				height={minHeight}
				visibleDragbar={false}
				preview="live"
				enableScroll
				textareaProps={{
					disabled,
					placeholder,
					"aria-label": placeholder,
					onBlur,
					name,
				}}
			/>
		</div>
	);
}
