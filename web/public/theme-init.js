/**
 * Theme bootstrap before React hydration (see root layout next/script beforeInteractive).
 * Applies `dark` on <html> from localStorage / system preference to reduce flash.
 */
(function () {
	try {
		var theme = localStorage.getItem("theme");
		var isDark = false;
		if (theme === "dark") {
			isDark = true;
		} else if (theme === "light") {
			isDark = false;
		} else if (theme === "system" || !theme) {
			isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		if (isDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	} catch (e) {}
})();
