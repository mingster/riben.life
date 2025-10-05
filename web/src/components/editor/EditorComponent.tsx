"use client";
import type { ContextStore } from "@uiw/react-md-editor";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type React from "react";
import { type FC, useCallback, useState } from "react";

// ANCHOR https://github.com/uiwjs/react-md-editor/tree/master
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
type OnChange = (
	value?: string,
	event?: React.ChangeEvent<HTMLTextAreaElement>,
	state?: ContextStore,
) => void;

interface EditorProps {
	markdown: string;
	onPChange?: (markdown: string) => void;
}

/**
 * Extend this Component further with the necessary plugins or props you need.
 * proxying the ref is necessary. Next.js dynamically imported components don't support refs.
 */
const MarkDownEditor: FC<EditorProps> = ({ markdown, onPChange }) => {
	const [value, setValue] = useState(markdown);
	const { theme } = useTheme();

	const onChange = useCallback<OnChange>(
		(val) => {
			setValue(val || "");
			onPChange?.(val || ""); //pass value back to parent component
		},
		[onPChange],
	);

	return (
		<div
			data-color-mode={theme}
			className="font-mono border max-h-132.5 min-h-72.5 overflow-y-auto"
		>
			<div className="wmde-markdown-var"> </div>

			<MDEditor
				height={"100%"}
				minHeight={500}
				style={{ width: "100%" }}
				value={value}
				onChange={onChange}
			/>
		</div>
	);
};

export default MarkDownEditor;
