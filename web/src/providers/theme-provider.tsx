"use client";

import {
	ThemeProvider as NextThemesProvider,
	type ThemeProviderProps,
} from "next-themes";

// https://github.com/pacocoursey/next-themes
// React 19: inline ThemeScript is patched via scripts/patch-next-themes-react19.mjs (see PR #386).
export default function ThemeProvider({
	children,
	...props
}: ThemeProviderProps) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
