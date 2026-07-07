"use client";

import { useState, useEffect } from "react";
import { Digest, DailyAnalytics } from "@/types";
import Rail from "@/components/Rail";
import EmailList from "@/components/EmailList";
import EmailDetail from "@/components/EmailDetail";
import Calendar from "@/components/Calendar";
import Header from "@/components/Header";
import Charts from "@/components/Charts";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const API_BASE = "http://localhost:8000";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";
type MobileView = "categories" | "list" | "detail";
type AppMode = "digest" | "calendar" | "chart";

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
	ALL: "All",
	IMPORTANT: "Important",
	ROUTINE: "Routine",
	JUNK: "Junk",
};

const VIEW_ORDER: MobileView[] = ["categories", "list", "detail"];

export default function Home() {
	const [digest, setDigest] = useState<Digest | null>(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [needsReauth, setNeedsReauth] = useState(false);
	const [selected, setSelected] = useState<CategoryFilter>("ALL");
	const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
	const [mobileView, setMobileView] = useState<MobileView>("categories");
	const [activeMode, setActiveMode] = useState<AppMode>("digest");
	const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);

	const { user, loading: authLoading } = useAuth();
	const router = useRouter();

	//Redirect to login if not authenticated (once the auth check finishes).
	useEffect(() => {
		if (!authLoading && user === null) {
			router.push("/login");
		}
	}, [authLoading, user, router]);

	function reconnectGmail() {
		// Same entry point the Header uses for first-time connect — re-running
		// consent issues a fresh refresh token and overwrites the dead one.
		window.location.href = `${API_BASE}/auth/gmail/connect`;
	}

	async function processNewEmails() {
		setProcessing(true);
		setError(null);
		setNeedsReauth(false); // clear any prior reauth state on a fresh attempt
		try {
			const res = await fetch(`${API_BASE}/digest/process`, {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				// detail is a structured object {code, message} for known errors,
				// or may be a plain string / absent for unexpected ones.
				const detail = data.detail;
				if (detail?.code === "gmail_reauth_required") {
					setNeedsReauth(true);
					setMobileView("detail"); // surface the banner where the user is looking
					return; // handled — don't fall through to the generic error path
				}
				const message =
					detail?.message ?? // structured error (e.g. gmail_not_connected)
					(typeof detail === "string" ? detail : null) ?? // legacy string detail
					`Something went wrong (${res.status})`;
				throw new Error(message);
			}
			const data = await res.json();
			setDigest(data.digest);
			await loadAnalytics(); //refresh calendar/chart data too
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setMobileView("detail"); // surface the error where the user is looking
		} finally {
			setProcessing(false);
		}
	}

	useEffect(() => {
		let cancelled = false;
		async function loadOnMount() {
			try {
				const res = await fetch(`${API_BASE}/digest/latest`, {
					credentials: "include",
				});
				if (!res.ok) throw new Error(`Server responded with ${res.status}`);
				const data = await res.json();
				if (!cancelled) setDigest(data.digest);
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Something went wrong");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		loadOnMount();
		return () => {
			cancelled = true;
		};
	}, []);

	async function loadAnalytics() {
		try {
			const res = await fetch(`${API_BASE}/analytics/daily`, {
				credentials: "include",
			});
			if (!res.ok) return; // non-critical; fail silently
			const data = await res.json();
			setAnalytics(data.analytics ?? []);
		} catch {
			// leave empty - non-critical
		}
	}

	useEffect(() => {
		loadAnalytics();
	}, []);

	function handleSelectCategory(category: CategoryFilter) {
		setSelected(category);
		setSelectedEmailId(null);
		setMobileView("list");
	}

	function handleSelectEmail(gmailId: string) {
		// Picking an email means the user is moving on — dismiss a generic error
		// so column 3 can show the email. needsReauth stays sticky: they truly
		// can't proceed until they reconnect, so it keeps priority.
		setError(null);
		setSelectedEmailId(gmailId);
		setMobileView("detail");
	}

	// Mobile slide: each panel's horizontal offset class based on position vs active view.
	function mobileOffset(panel: MobileView): string {
		const panelIndex = VIEW_ORDER.indexOf(panel);
		const activeIndex = VIEW_ORDER.indexOf(mobileView);
		if (panelIndex < activeIndex) return "-translate-x-full";
		if (panelIndex > activeIndex) return "translate-x-full";
		return "translate-x-0";
	}

	//While checking auth, or if not logged in, show nothing/ loading.
	if (authLoading || user === null) {
		return (
			<div className="flex h-screen items-center justify-center bg-canvas">
				<p className="text-sm text-ink-soft">Loading…</p>
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
			<Header />

			{/* Body — rail + mode panels */}
			<div className="relative flex-1 overflow-hidden md:flex md:flex-row">
				{/* Column 1 — Rail */}
				<div
					className={`absolute inset-0 flex h-full w-full flex-col transition-transform duration-300 ease-out ${mobileOffset("categories")} md:static md:w-60 md:shrink-0 md:translate-x-0 md:transition-none`}
				>
					<Rail
						digest={digest}
						selected={selected}
						onSelect={handleSelectCategory}
						onProcess={processNewEmails}
						processing={processing}
						activeMode={activeMode}
						onModeChange={setActiveMode}
					/>
				</div>

				{/* DIGEST MODE — list + detail panels */}
				{activeMode === "digest" && (
					<>
						{/* Column 2 — email list (list only: the digested email categories) */}
						<div
							className={`absolute inset-0 flex h-full w-full flex-col border-r border-border transition-transform duration-300 ease-out ${mobileOffset("list")} md:static md:w-80 md:shrink-0 md:translate-x-0 md:transition-none`}
						>
							<div className="flex items-center gap-2 border-b border-border px-3 py-3 md:hidden">
								<button
									onClick={() => setMobileView("categories")}
									className="text-sm text-accent"
								>
									‹ Categories
								</button>
								<span className="ml-auto text-sm font-medium text-ink">
									{CATEGORY_LABEL[selected]}
								</span>
							</div>
							<div className="flex-1 overflow-y-auto">
								{loading && (
									<p className="px-3 py-4 text-sm text-ink-soft">
										Loading latest digest…
									</p>
								)}
								{!loading && !processing && digest === null && (
									<p className="px-3 py-4 text-sm text-ink-soft">
										No digest yet. Click &quot;Process new emails&quot; to
										create one.
									</p>
								)}
								{!loading && digest && (
									<EmailList
										digest={digest}
										selected={selected}
										selectedEmailId={selectedEmailId}
										onSelectEmail={handleSelectEmail}
									/>
								)}
							</div>
						</div>

						{/* Column 3 — detail / process-outcome surface.
						    Priority: reauth (blocking) > error > first-run processing >
						    email detail > empty. All outcomes of a Process action live here. */}
						<div
							className={`absolute inset-0 flex h-full w-full flex-col overflow-hidden bg-surface transition-transform duration-300 ease-out ${mobileOffset("detail")} md:static md:flex-1 md:min-w-0 md:translate-x-0 md:transition-none`}
						>
							<div className="flex items-center gap-2 border-b border-border px-3 py-3 md:hidden">
								<button
									onClick={() => setMobileView("list")}
									className="text-sm text-accent"
								>
									‹ {CATEGORY_LABEL[selected]}
								</button>
							</div>
							<div className="flex-1 overflow-hidden">
								{needsReauth ? (
									<div className="flex h-full items-center justify-center p-6">
										<div className="max-w-sm text-center">
											<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-important-soft">
												<svg
													width="24"
													height="24"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="text-important"
												>
													<path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
												</svg>
											</div>
											<h2 className="mb-2 text-lg font-semibold text-ink">
												Gmail connection expired
											</h2>
											<p className="mb-6 text-sm text-ink-soft">
												Your Gmail connection is no longer valid. Reconnect to
												keep processing your inbox.
											</p>
											<button
												onClick={reconnectGmail}
												className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
											>
												Reconnect Gmail
											</button>
										</div>
									</div>
								) : error ? (
									<div className="flex h-full items-center justify-center p-6">
										<div className="max-w-sm text-center">
											<h2 className="mb-2 text-lg font-semibold text-ink">
												Something went wrong
											</h2>
											<p className="mb-6 text-sm text-ink-soft">{error}</p>
											<button
												onClick={processNewEmails}
												className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
											>
												Try again
											</button>
										</div>
									</div>
								) : processing && digest === null ? (
									<div className="flex h-full items-center justify-center p-6">
										<div className="text-center">
											<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
											<p className="text-sm text-ink-soft">
												Processing your emails…
											</p>
										</div>
									</div>
								) : digest ? (
									<EmailDetail
										digest={digest}
										selectedEmailId={selectedEmailId}
										processing={processing}
									/>
								) : (
									<div className="flex h-full items-center justify-center">
										<p className="text-sm text-ink-faint">No digest loaded</p>
									</div>
								)}
							</div>
						</div>
					</>
				)}

				{/* CALENDAR MODE */}
				<div
					className={`absolute inset-0 z-10 flex h-full w-full flex-col bg-surface transition-transform duration-300 ease-out ${
						activeMode === "calendar" ? "translate-x-0" : "translate-x-full"
					} md:z-0 md:translate-x-0 md:transition-none ${
						activeMode === "calendar"
							? "md:static md:flex md:flex-1"
							: "md:hidden"
					}`}
				>
					<div className="flex items-center gap-2 border-b border-border px-3 py-3 md:hidden">
						<button
							onClick={() => setActiveMode("digest")}
							className="text-sm text-accent"
						>
							‹ Menu
						</button>
					</div>
					<div className="flex-1 overflow-y-auto">
						<Calendar
							analytics={analytics}
							year={new Date().getFullYear()}
							month={new Date().getMonth()}
						/>
					</div>
				</div>

				{/* CHART MODE */}
				<div
					className={`absolute inset-0 z-10 flex h-full w-full flex-col bg-surface transition-transform duration-300 ease-out ${
						activeMode === "chart" ? "translate-x-0" : "translate-x-full"
					} md:z-0 md:translate-x-0 md:transition-none ${
						activeMode === "chart" ? "md:static md:flex md:flex-1" : "md:hidden"
					}`}
				>
					<div className="flex items-center gap-2 border-b border-border px-3 py-3 md:hidden">
						<button
							onClick={() => setActiveMode("digest")}
							className="text-sm text-accent"
						>
							‹ Menu
						</button>
					</div>
					<div className="flex-1 overflow-y-auto">
						<Charts analytics={analytics} />
					</div>
				</div>
			</div>
		</div>
	);
}
