/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    /*
     * The UI lives in solid/. src/ keeps the shared lib/api/styles layer.
     *
     * This listed only src/, so after the move to Solid every utility class
     * used by a component was invisible to Tailwind and got purged — the
     * stylesheet fell from ~171 KB to 78 KB and the app lost its spacing,
     * sizing and layout. Both trees must be scanned.
     */
    content: [
        "./index.html",
        "./solid/index.html",
        "./solid/**/*.{ts,tsx,js,jsx}",
        "./src/**/*.{ts,tsx,js,jsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) + 2px)',
                sm: 'calc(var(--radius) + 4px)'
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                ink: 'hsl(var(--ink))',
                bone: 'hsl(var(--bone))',
                // Role identity hues already defined in index.css. Exposed as
                // utilities so components stop reaching for raw amber/blue/green
                // to distinguish a chair from a minutes taker from a teacher.
                role: {
                    student: 'hsl(var(--role-student))',
                    teacher: 'hsl(var(--role-teacher))',
                    chair: 'hsl(var(--role-chair))',
                    minutes: 'hsl(var(--role-minutes))',
                    admin: 'hsl(var(--role-admin))',
                    editor: 'hsl(var(--role-editor))',
                },
                mabis: 'hsl(var(--primary))',
                golden: 'hsl(var(--secondary))',
            },
            fontFamily: {
                heading: ['var(--font-heading)'],
                body: ['var(--font-body)'],
                display: ['var(--font-display)'],
                mono: ['var(--font-mono)'],
                jp: ['var(--font-body)']
            },
            letterSpacing: { ultra: '-0.06em', tightest: '-0.05em' },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out'
            }
        }
    },
    safelist: ['bg-mabis', 'text-mabis', 'border-mabis', 'bg-golden', 'text-golden', 'bg-ink', 'text-ink', 'bg-bone'],
    plugins: [require("tailwindcss-animate")],
}
