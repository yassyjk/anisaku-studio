// Tailwind CSS の設定ファイルです。どのファイルで Tailwind を使うかを指定します。
/** @type {import('tailwindcss').Config} */
module.exports = {
    // デザインを適用する対象のファイルをすべて指定します。
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {},
    },
    plugins: [],
};
