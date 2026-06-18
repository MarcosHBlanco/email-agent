"use client";

import { useState, useEffect } from "react";
import { Digest } from "@/types";
import Rail from "@/components/Rail";
import EmailList from "@/components/EmailList";
import EmailDetail from "@/components/EmailDetail";

const API_BASE = "http://localhost:8000";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";
type MobileView = "categories" | "list" | "detail";

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
	ALL: "All",
	IMPORTANT: "Important",
	ROUTINE: "Routine",
	JUNK: "Junk",
};

export default function Home() {
	const [digest, setDigest] = useState<Digest | null>(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<CategoryFilter>("ALL");
	const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
	const [mobileView, setMobileView] = useState<MobileView>("categories");

	async function processNewEmails() {
		setProcessing(true);
		setError(null);
		try {
			const res = await fetch(`${API_BASE}/digest/process`, { method: "POST" });
			if (!res.ok) throw new Error(`Server responded with ${res.status}`);
			const data = await res.json();
			setDigest(data.digest);
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
				const res = await fetch(`${API_BASE}/digest/latest`);
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

	// Drill-forward handlers — also advance the mobile view level.
	function handleSelectCategory(category: CategoryFilter) {
		setSelected(category);
		setSelectedEmailId(null);
		setMobileView("list");
	}

	function handleSelectEmail(gmailId: string) {
		setSelectedEmailId(gmailId);
		setMobileView("detail");
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink md:flex-row">
			{/* Column 1 — Rail. Mobile: shown only at "categories" level. Desktop: always. */}
			<div
				className={`${mobileView === "categories" ? "flex" : "hidden"} h-full w-full flex-col md:flex md:w-60 md:shrink-0`}
			>
				<Rail
					digest={digest}
					selected={selected}
					onSelect={handleSelectCategory}
					onProcess={processNewEmails}
					processing={processing}
				/>
			</div>

			{/* Column 2 — email list. Mobile: shown only at "list" level. Desktop: always. */}
			<div
				className={`${mobileView === "list" ? "flex" : "hidden"} h-full w-full flex-col border-r border-border md:flex md:w-80 md:shrink-0`}
			>
				{/* Mobile-only header with back button */}
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
					{!loading && digest === null && (
						<p className="px-3 py-4 text-sm text-ink-soft">
							No digest yet. Click &quot;Process new emails&quot; to create one.
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

			{/* Column 3 — detail. Mobile: shown only at "detail" level. Desktop: always. */}
			<div
				className={`${mobileView === "detail" ? "flex" : "hidden"} h-full w-full flex-col overflow-hidden bg-surface md:flex md:flex-1 md:min-w-0`}
			>
				{/* Mobile-only header with back button */}
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
		</div>
	);
}
