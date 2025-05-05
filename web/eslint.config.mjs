import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import pluginReact from "eslint-plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	//...compat.extends("next/core-web-vitals", "next/typescript"),
	// ? https://github.com/jsx-eslint/eslint-plugin-react
	{
		// @ts-ignore
		...pluginReact.configs.flat.recommended,
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	...compat.config({
		extends: ["next/core-web-vitals", "next/typescript"],
		rules: {
			// ! TO COMPILE SHADCN EXAMPLES, PLEASE REMOVE AS NEEDED
			//'@next/next/no-html-link-for-pages': 'off',
			"@next/next/no-page-custom-font": "off",
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/ban-ts-comment": "off",

			"import/no-unresolved": "off",
			"import/no-named-as-default": "off",
			"import/named": "off",
			"import/no-named-as-default-member": "off",
			"newline-before-return": "off",
			"no-unused-vars": "off",
			"no-var": "off",
			"promise/always-return": "off",

			"react/no-unescaped-entities": "off",
			"react/react-in-jsx-scope": "off",
			"react-hooks/exhaustive-deps": "off",
			"react/display-name": "off",
			"react/prop-types": "off",
			"react/no-unknown-property": "off",
			/*
      'tailwindcss/no-custom-classname': 'off',
      'tailwindcss/migration-from-tailwind-2': 'off',
      'tailwindcss/no-unnecessary-arbitrary-value': 'off',
      'tailwindcss/classnames-order': 'off',
      */
		},
	}),
];

export default eslintConfig;
