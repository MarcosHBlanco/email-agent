"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

import { API_BASE } from "@/lib/config";

export default function Header() {
	const { theme, toggleTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [gmail, setGmail] = useState<{
		connected: boolean;
		email: string | null;
	} | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function loadGmailStatus() {
			try {
				const res = await fetch(`${API_BASE}/auth/gmail/status`, {
					credentials: "include",
				});
				if (!res.ok) return;
				const data = await res.json();
				if (!cancelled) setGmail(data);
			} catch {
				// non-critical; leave null}
			}
		}
		loadGmailStatus();
		return () => {
			cancelled = true;
		};
	}, []);

	function connectGmail() {
		window.location.href = `${API_BASE}/auth/gmail/connect`;
	}

	const { user, logout } = useAuth();
	const router = useRouter();

	async function handleLogout() {
		await logout();
		router.push("/login");
	}

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
				<p className="text-xs text-ink-faint">
					{user ? user.email : "Welcome"}
				</p>
			</div>

			{/* Gmail connection status */}
			<div className="flex items-center">
				{gmail?.connected ? (
					<div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-soft">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
						<span className="hidden sm:inline">{gmail.email}</span>
						<span className="sm:hidden">Gmail</span>
					</div>
				) : gmail && !gmail.connected ? (
					<button
						onClick={connectGmail}
						className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-hover"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect x="2" y="4" width="20" height="16" rx="2" />
							<path d="m22 7-10 5L2 7" />
						</svg>
						Connect Gmail
					</button>
				) : null}
			</div>

			<div className="flex items-center gap-1">
				<button
					onClick={() => router.push("/app/profile")}
					aria-label="Preferences"
					className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
				>
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
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
				</button>
				<button
					onClick={handleLogout}
					className="rounded-md px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
				>
					Log out
				</button>
				<button
					onClick={toggleTheme}
					aria-label="Toggle theme"
					className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
				>
					{!mounted ? (
						<span className="h-4.5 w-4.5" />
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
			</div>
		</header>
	);
}
