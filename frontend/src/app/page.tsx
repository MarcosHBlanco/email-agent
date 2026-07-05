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

	async function processNewEmails() {
		setProcessing(true);
		setError(null);
		try {
			const res = await fetch(`${API_BASE}/digest/process`, {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.detail ?? `Something qwent wrong (${res.status})`);
			}
			const data = await res.json();
			setDigest(data.digest);
			await loadAnalytics(); //refresh calendar/chart data too
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
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
						{/* Column 2 — email list */}
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
								{error && (
									<p className="m-3 rounded-md bg-important-soft px-3 py-2 text-sm text-important">
										{error}
									</p>
								)}
								{loading && (
									<p className="px-3 py-4 text-sm text-ink-soft">
										Loading latest digest…
									</p>
								)}
								{!loading && processing && digest === null && (
									<p className="px-3 py-4 text-sm text-ink-soft">
										Processing your emails…
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

						{/* Column 3 — detail */}
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
								{digest ? (
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
