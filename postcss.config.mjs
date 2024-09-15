/** @type {import('postcss-load-config').Config} */

const config = {
    plugins: {
        tailwindcss: {},
        'tailwindcss/nesting': {},
        'postcss-focus-visible': {},
        autoprefixer: {},
    },
};
//require.resolve('./has-fixup.js')

export default config;
