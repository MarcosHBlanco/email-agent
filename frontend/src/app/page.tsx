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
		<div
			style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}
		>
			<Sidebar digest={digest} selected={selected} onSelect={setSelected} />

			<main style={{ flex: 1, padding: "24px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "20px",
					}}
				>
					<h1 style={{ fontSize: "20px", color: "#222", margin: 0 }}>
						Email Agent
					</h1>
					<button
						onClick={processNewEmails}
						disabled={processing}
						style={{
							padding: "8px 16px",
							borderRadius: "6px",
							border: "1px solid #1F4E79",
							background: processing ? "#ccc" : "#1F4E79",
							color: "#fff",
							cursor: processing ? "default" : "pointer",
						}}
					>
						{processing ? "Processing..." : "Process new emails"}
					</button>
				</div>

				{error && <p style={{ color: "red" }}>Error: {error}</p>}
				{loading && <p>Loading latest digest...</p>}
				{!loading && digest === null && (
					<p>
						No digest yet. Click &quot;Process new emails&quot; to create one.
					</p>
				)}
				{!loading && digest && <DigestView digest={digest} />}
			</main>
		</div>
	);
}
