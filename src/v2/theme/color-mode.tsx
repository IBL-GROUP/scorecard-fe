"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type ColorMode = "light" | "dark"

interface ColorModeContextType {
    colorMode: ColorMode
    toggleColorMode: () => void
    setColorMode: (mode: ColorMode) => void
}

const ColorModeContext = createContext<ColorModeContextType | null>(null)

export function ColorModeProvider({ children }: { children: ReactNode }) {
    const [colorMode, setColorModeState] = useState<ColorMode>(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem("chakra-ui-color-mode")
                if (stored === "light" || stored === "dark") return stored
            } catch {
                /* storage blocked: fall back to the OS setting */
            }
            return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        }
        return "light"
    })

    useEffect(() => {
        try {
            localStorage.setItem("chakra-ui-color-mode", colorMode)
        } catch {
            /* ignore */
        }
        document.documentElement.setAttribute("data-theme", colorMode)
        document.documentElement.classList.toggle("dark", colorMode === "dark")
        document.documentElement.classList.toggle("light", colorMode === "light")
    }, [colorMode])

    const toggleColorMode = () => {
        setColorModeState((prev) => (prev === "light" ? "dark" : "light"))
    }

    const setColorMode = (mode: ColorMode) => {
        setColorModeState(mode)
    }

    return (
        <ColorModeContext.Provider value={{ colorMode, toggleColorMode, setColorMode }}>
            {children}
        </ColorModeContext.Provider>
    )
}

export function useColorMode() {
    const context = useContext(ColorModeContext)
    if (!context) {
        throw new Error("useColorMode must be used within ColorModeProvider")
    }
    return context
}

export function useColorModeValue<T>(light: T, dark: T): T {
    const { colorMode } = useColorMode()
    return colorMode === "light" ? light : dark
}
