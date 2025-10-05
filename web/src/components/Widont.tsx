export function Widont({ children }: { children: React.ReactNode }) {
	if (typeof children !== "string") {
		return children;
	}

	return children.replace(/ ([^ ]+)$/, "\u00A0$1");
}
