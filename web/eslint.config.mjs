import pluginJs from '@eslint/js';
// @ts-ignore
import nextPlugin from '@next/eslint-plugin-next';

//import eslintConfigPrettier from 'eslint-config-prettier';
// @ts-ignore
import importPlugin from 'eslint-plugin-import';
// @ts-ignore
import pluginPromise from 'eslint-plugin-promise';
import pluginReact from 'eslint-plugin-react';
import tailwind from 'eslint-plugin-tailwindcss';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}']
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node }
    }
  },
  pluginJs.configs.recommended, // ? https://github.com/eslint/eslint
  importPlugin.flatConfigs.recommended, // ? https://github.com/import-js/eslint-plugin-import

  // ? https://github.com/typescript-eslint/typescript-eslint
  ...tseslint.configs.recommended,

  // ? https://github.com/eslint-community/eslint-plugin-promise
  pluginPromise.configs['flat/recommended'],

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
  // @ts-ignore
  pluginReact.configs.flat['jsx-runtime'], // ? https://github.com/jsx-eslint/eslint-plugin-react
  //eslintConfigPrettier, // ? https://github.com/prettier/eslint-config-prettier
  ...tailwind.configs['flat/recommended'], // ? https://github.com/francoismassart/eslint-plugin-tailwindcss
  {
    rules: {
      'no-unused-vars': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'newline-before-return': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'tailwindcss/no-custom-classname': 'off',
      'tailwindcss/migration-from-tailwind-2': 'off',
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off',
      // ! TO COMPILE SHADCN EXAMPLES, PLEASE REMOVE AS NEEDED
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'react/no-unescaped-entities': 'off',
      'react/no-unknown-property': 'off',
      'tailwindcss/no-unnecessary-arbitrary-value': 'off',
      'tailwindcss/classnames-order': 'off',
      'import/named': 'off',
      'import/no-named-as-default-member': 'off'
    }
  },
  // ! ===================== DISCLAIMER =====================
  // ! There is no official solution available for new ESLint 9 flat config structure for NextJS
  // ! The solution is taken from the community and may not be the best practice, use it at your own risk
  // ? Ref: https://github.com/vercel/next.js/discussions/49337?sort=top#discussioncomment-5998603
  // ! ======================================================
  {
    plugins: {
      '@next/next': nextPlugin
    },
    "settings": {
      "import/resolver": {
        // You will also need to install and configure the TypeScript resolver
        // See also https://github.com/import-js/eslint-import-resolver-typescript#configuration
        "typescript": true,
        "node": true,
        react: {
          version: 'detect'
        }
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'off',
      // ! TO COMPILE SHADCN EXAMPLES, PLEASE REMOVE AS NEEDED
      '@next/next/no-html-link-for-pages': 'off',

      //"@typescript-eslint/no-unused-vars": "error",
      //"@typescript-eslint/no-explicit-any": "error"
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-var": "off",
      "@typescript-eslint/no-require-imports": "off",
      "promise/always-return": "off",
      //"newline-before-return": "off"
    }
  },
  {
    ignores: ['.next/*']
  }
];
