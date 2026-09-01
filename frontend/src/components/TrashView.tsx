"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Digest, EmailItem } from "@/types";
import EmailListItem from "@/components/EmailListItem";
import EmailDetail from "@/components/EmailDetail";
import { staggerContainer } from "@/lib/motion";
import { API_BASE } from "@/lib/config";

const PAGE_SIZE = 50;

type Category = "IMPORTANT" | "ROUTINE" | "JUNK";
type TrashEmail = EmailItem & { category: Category };

export default function TrashView({
	selectedEmailId,
	onSelectEmail,
	onBackToNav,
}: {
	selectedEmailId: string | null;
	onSelectEmail: (gmailId: string | null) => void;
	onBackToNav: () => void;
}) {
	const [emails, setEmails] = useState<TrashEmail[]>([]);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function loadPage(currentOffset: number) {
		setLoading(true);
		setError(null);
		try {
			// DIFF 1: fetches /emails/trash, not /emails/all
			const res = await fetch(
				`${API_BASE}/emails/trash?limit=${PAGE_SIZE}&offset=${currentOffset}`,
				{ credentials: "include" },
			);
			if (!res.ok) throw new Error("Couldn't load trash");
			const data = await res.json();
			setEmails((prev) => [...prev, ...data.emails]);
			setHasMore(data.has_more);
			setOffset(currentOffset + data.emails.length);
		} catch {
			setError("Couldn't load trash");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(
					`${API_BASE}/emails/trash?limit=${PAGE_SIZE}&offset=0`,
					{ credentials: "include" },
				);
				if (!res.ok) throw new Error("Couldn't load trash");
				const data = await res.json();
				if (cancelled) return;
				setEmails(data.emails);
				setHasMore(data.has_more);
				setOffset(data.emails.length);
			} catch {
				if (!cancelled) setError("Couldn't load trash");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// DIFF 2: the action is RESTORE (untrash), not delete. Same optimistic
	// pattern — remove from this list now, POST to untrash, roll back on
	// failure. A restored email leaves Trash (goes back to All emails/digest).
	function restoreEmail(gmailId: string) {
		const index = emails.findIndex((e) => e.gmail_id === gmailId);
		if (index === -1) return;
		const removed = emails[index];

		setEmails((prev) => prev.filter((e) => e.gmail_id !== gmailId));
		if (selectedEmailId === gmailId) onSelectEmail(null);

		fetch(`${API_BASE}/emails/${encodeURIComponent(gmailId)}/untrash`, {
			method: "POST",
			credentials: "include",
		}).catch(() => {
			setEmails((prev) => {
				const copy = [...prev];
				copy.splice(index, 0, removed);
				return copy;
			});
		});
	}

	const asDigest: Digest = {
		total: emails.length,
		generated_at: "",
		buckets: {
			IMPORTANT: emails.filter((e) => e.category === "IMPORTANT"),
			ROUTINE: emails.filter((e) => e.category === "ROUTINE"),
			JUNK: emails.filter((e) => e.category === "JUNK"),
		},
	};

	const selectedEmail = selectedEmailId
		? (emails.find((e) => e.gmail_id === selectedEmailId) ?? null)
		: null;

	// DETAIL PANE
	if (selectedEmail) {
		return (
			<div className="flex h-full w-full flex-col">
				<div className="border-b border-border px-4 py-3">
					<button
						onClick={() => onSelectEmail(null)}
						className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
					>
						← Trash
					</button>
				</div>
				<div className="min-h-0 flex-1">
					{/* DIFF 3: onDelete is wired to restoreEmail. In EmailDetail the
					    action button still says "Trash", but here it untrashes — see
					    note below; we accept this for now. */}
					<EmailDetail
						digest={asDigest}
						selectedEmailId={selectedEmailId}
						processing={false}
						onDelete={restoreEmail}
						actionLabel="Restore"
						showReply={false}
					/>
				</div>
			</div>
		);
	}

	// LIST PANE
	return (
		<div className="flex h-full w-full flex-col">
			<div className="border-b border-border px-4 py-3">
				<button
					onClick={onBackToNav}
					className="mb-1 text-sm text-accent md:hidden"
				>
					‹ Menu
				</button>
				<h2 className="font-serif text-lg font-semibold tracking-tight text-ink">
					Trash
				</h2>
			</div>
			<div className="flex-1 overflow-y-auto">
				{emails.length === 0 && loading && (
					<p className="px-4 py-4 text-sm text-ink-soft">Loading…</p>
				)}
				{emails.length === 0 && !loading && !error && (
					<p className="px-4 py-4 text-sm text-ink-soft">Trash is empty.</p>
				)}
				{error && <p className="px-4 py-4 text-sm text-important">{error}</p>}

				<motion.div
					variants={staggerContainer}
					initial="hidden"
					animate="visible"
					className="divide-y divide-border"
				>
					{emails.map((email) => (
						<EmailListItem
							key={email.gmail_id}
							email={email}
							category={email.category}
							isSelected={email.gmail_id === selectedEmailId}
							onSelect={() => onSelectEmail(email.gmail_id)}
						/>
					))}
				</motion.div>

				{hasMore && (
					<div className="p-4">
						<button
							onClick={() => loadPage(offset)}
							disabled={loading}
							className="w-full rounded-md border border-border py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-60"
						>
							{loading ? "Loading…" : "Load more"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
