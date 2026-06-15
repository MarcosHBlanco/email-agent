"use client";

import { useState, useEffect } from "react";
import { Digest } from "@/types";
import Rail from "@/components/Rail";
import EmailList from "@/components/EmailList";

const API_BASE = "http://localhost:8000";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";

export default function Home() {
	const [digest, setDigest] = useState<Digest | null>(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<CategoryFilter>("ALL");
	const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

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
		<div className="flex h-screen overflow-hidden bg-canvas text-ink">
			<Rail
				digest={digest}
				selected={selected}
				onSelect={(category) => {
					setSelected(category);
					setSelectedEmailId(null);
				}}
				onProcess={processNewEmails}
				processing={processing}
			/>

			<main className="flex-1 min-w-0 overflow-y-auto">
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
						<EmailList
							digest={digest}
							selected={selected}
							selectedEmailId={selectedEmailId}
							onSelectEmail={setSelectedEmailId}
						/>
					)}
				</div>
			</main>
		</div>
	);
}
