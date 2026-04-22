import type { ReactNode } from "react";

export function Widont({ children }: { children: ReactNode }) {
	if (typeof children !== "string") {
		return children;
	}

	return children.replace(/ ([^ ]+)$/, "\u00A0$1");
}
