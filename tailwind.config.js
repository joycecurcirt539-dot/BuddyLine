/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            backgroundImage: {
                'primary-gradient': 'linear-gradient(to right, #22d3ee, #14b8a6, #3b82f6)',
            }
        },
    },
    plugins: [],
}
