"use client";

import { useState } from "react";
import { Digest } from "@/types";

export default function Home() {
	const [digest, setDigest] = useState<Digest | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function fetchDigest() {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("http://localhost:8000/digest");
			if (!response.ok) {
				throw new Error(`Server responded with ${response.status}`);
			}
			const data = await response.json();
			setDigest(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
			<h1>Email Agent</h1>
			<button onClick={fetchDigest} disabled={loading}>
				{loading ? "Running digest..." : "Run Digest"}
			</button>

			{error && <p style={{ color: "red" }}>Error: {error}</p>}

			{digest && (
				<pre style={{ marginTop: "1rem", padding: "1rem" }}>
					{JSON.stringify(digest, null, 2)}
				</pre>
			)}
		</main>
	);
}
