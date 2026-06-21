"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
	theme: Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: Theme) {
	const root = document.documentElement;
	if (t === "dark") {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(() => {
		//Runs once on init. Guard for server (no window/localStorage there).
		if (typeof window === "undefined") return "light";
		const stored = localStorage.getItem("theme") as Theme | null;
		if (stored) return stored;
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	});

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	function toggleTheme() {
		const next: Theme = theme === "dark" ? "light" : "dark";
		setTheme(next);
		// applyTheme(next);
		localStorage.setItem("theme", next);
	}

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const ctx = useContext(ThemeContext);
	if (ctx === null) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return ctx;
}
