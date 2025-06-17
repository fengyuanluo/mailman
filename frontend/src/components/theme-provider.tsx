'use client'

import * as React from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
    children: React.ReactNode
    attribute?: string
    defaultTheme?: Theme
    enableSystem?: boolean
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
    undefined
)

export function ThemeProvider({
    children,
    attribute = 'class',
    defaultTheme = 'system',
    enableSystem = true,
    storageKey = 'theme',
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = React.useState<Theme>(defaultTheme)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        const storedTheme = localStorage.getItem(storageKey) as Theme
        if (storedTheme) {
            setTheme(storedTheme)
        }
    }, [storageKey])

    React.useEffect(() => {
        if (!mounted) return

        const root = window.document.documentElement
        root.classList.remove('light', 'dark')

        if (theme === 'system' && enableSystem) {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
            root.classList.add(systemTheme)
        } else {
            root.classList.add(theme)
        }
    }, [theme, enableSystem, mounted])

    const value = React.useMemo(
        () => ({
            theme,
            setTheme: (newTheme: Theme) => {
                localStorage.setItem(storageKey, newTheme)
                setTheme(newTheme)
            },
        }),
        [theme, storageKey]
    )

    if (!mounted) {
        return <>{children}</>
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = React.useContext(ThemeProviderContext)

    // Return a default value instead of throwing error immediately
    // This prevents errors during SSR or initial render
    if (context === undefined) {
        if (typeof window !== 'undefined') {
            console.warn('useTheme must be used within a ThemeProvider')
        }
        return {
            theme: 'system' as Theme,
            setTheme: () => { }
        }
    }

    return context
}