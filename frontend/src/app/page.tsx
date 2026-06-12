"use client";

import { useState, useEffect } from "react";
import { Digest } from "@/types";
import Sidebar from "@/components/Sidebar";
import DigestView from "@/components/DigestView";

const API_BASE = "http://localhost:8000";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";

export default function Home() {
	const [digest, setDigest] = useState<Digest | null>(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<CategoryFilter>("ALL");

	// WRITE path: run a new processing pass, then show the fresh result.
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

	// READ path: fetch the stored digest automatically when the page loads.
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

	return (
		<div className="flex min-h-screen bg-canvas text-ink">
			<Sidebar digest={digest} selected={selected} onSelect={setSelected} />

			<main className="flex-1 min-w-0">
				{/* Top bar */}
				<header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-canvas/80 backdrop-blur px-6 py-3.5">
					<div className="flex items-baseline gap-2">
						<h1 className="text-base font-semibold text-ink">Email Agent</h1>
						{digest && (
							<span className="text-xs text-ink-faint tabular-nums">
								{digest.total} processed
							</span>
						)}
					</div>

					<button
						onClick={processNewEmails}
						disabled={processing}
						className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
					>
						{processing ? "Processing…" : "Process new emails"}
					</button>
				</header>

				{/* Content */}
				<div className="px-6 py-5">
					{error && (
						<p className="mb-4 rounded-md bg-important-soft px-3 py-2 text-sm text-important">
							{error}
						</p>
					)}
					{loading && (
						<p className="text-sm text-ink-soft">Loading latest digest…</p>
					)}
					{!loading && digest === null && (
						<p className="text-sm text-ink-soft">
							No digest yet. Click &quot;Process new emails&quot; to create one.
						</p>
					)}
					{!loading && digest && (
						<DigestView digest={digest} selected={selected} />
					)}
				</div>
			</main>
		</div>
	);
}
