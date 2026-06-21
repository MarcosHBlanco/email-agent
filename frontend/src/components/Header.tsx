"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

export default function Header() {
	const { theme, toggleTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		// The mounted flag is intentional: we must render identically on server
		// and first client pass (to avoid hydration mismatch), then update after
		// mount. This is the standard pattern; the lint rule is a false positive here.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true);
	}, []);

	return (
		<header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
			{/* Left — app identity + welcome */}
			<div className="flex flex-col">
				<h1 className="text-sm font-semibold leading-tight text-ink">
					Email Agent
				</h1>
				<p className="text-xs text-ink-faint">Welcome back, Marcos</p>
			</div>

			{/* Right — theme toggle */}
			<button
				onClick={toggleTheme}
				aria-label="Toggle theme"
				className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
			>
				{!mounted ? (
					<span className="h-[18px] w-[18px]" />
				) : theme === "dark" ? (
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="12" cy="12" r="4" />
						<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
					</svg>
				) : (
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				)}
			</button>
		</header>
	);
}
