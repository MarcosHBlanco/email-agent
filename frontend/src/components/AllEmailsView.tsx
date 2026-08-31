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
type AllEmail = EmailItem & { category: Category };

export default function AllEmailsView({
	selectedEmailId,
	onSelectEmail,
	onBackToNav,
}: {
	selectedEmailId: string | null;
	onSelectEmail: (gmailId: string | null) => void;
	onBackToNav: () => void;
}) {
	const [emails, setEmails] = useState<AllEmail[]>([]);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function loadPage(currentOffset: number) {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`${API_BASE}/emails/all?limit=${PAGE_SIZE}&offset=${currentOffset}`,
				{ credentials: "include" },
			);
			if (!res.ok) throw new Error("Couldn't load emails");
			const data = await res.json();
			setEmails((prev) => [...prev, ...data.emails]);
			setHasMore(data.has_more);
			setOffset(currentOffset + data.emails.length);
		} catch {
			setError("Couldn't load emails");
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
					`${API_BASE}/emails/all?limit=${PAGE_SIZE}&offset=0`,
					{ credentials: "include" },
				);
				if (!res.ok) throw new Error("Couldn't load emails");
				const data = await res.json();
				if (cancelled) return;
				setEmails(data.emails);
				setHasMore(data.has_more);
				setOffset(data.emails.length);
			} catch {
				if (!cancelled) setError("Couldn't load emails");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// Delete, operating on THIS view's own list (the digest's deleteEmail can't
	// help — it mutates digest state, not ours). Same server call, same
	// optimistic pattern: remove now, POST to trash, put it back on failure.
	function deleteEmail(gmailId: string) {
		const index = emails.findIndex((e) => e.gmail_id === gmailId);
		if (index === -1) return;
		const removed = emails[index];

		setEmails((prev) => prev.filter((e) => e.gmail_id !== gmailId));
		if (selectedEmailId === gmailId) onSelectEmail(null);

		fetch(`${API_BASE}/emails/${encodeURIComponent(gmailId)}/trash`, {
			method: "POST",
			credentials: "include",
		}).catch(() => {
			// Roll back: re-insert at the original position so order is preserved.
			setEmails((prev) => {
				const copy = [...prev];
				copy.splice(index, 0, removed);
				return copy;
			});
		});
	}
	// Mark-as-read on this view's own list. Mirrors the digest's markAsRead:
	// optimistic and silent — flip is_read now, tell the server, don't roll
	// back on failure (worst case it's bold again after a reload). Skip the
	// request entirely if it's already read.
	function markAsRead(gmailId: string) {
		const target = emails.find((e) => e.gmail_id === gmailId);
		if (!target || target.is_read) return; // already read — no work, no request

		setEmails((prev) =>
			prev.map((e) => (e.gmail_id === gmailId ? { ...e, is_read: true } : e)),
		);

		fetch(`${API_BASE}/emails/${encodeURIComponent(gmailId)}/read`, {
			method: "POST",
			credentials: "include",
		}).catch(() => {
			// deliberately silent — see above
		});
	}

	// EmailDetail looks the selected email up inside a digest's buckets. Rather
	// than change EmailDetail (which the real digest depends on), hand it a
	// digest-shaped view of our flat list — same shape, so findEmailById works.
	const asDigest: Digest = {
		total: emails.length,
		generated_at: "",
		buckets: {
			IMPORTANT: emails.filter((e) => e.category === "IMPORTANT"),
			ROUTINE: emails.filter((e) => e.category === "ROUTINE"),
			JUNK: emails.filter((e) => e.category === "JUNK"),
		},
	};

	// One pane at a time: the list, OR the detail of a selected email. This is
	// what makes it work identically on mobile and desktop — no breakpoint-hidden
	// panel, just a boolean. "Back" is the same clear-selection we use on delete.
	const selectedEmail = selectedEmailId
		? (emails.find((e) => e.gmail_id === selectedEmailId) ?? null)
		: null;

	// DETAIL PANE — shown when an email is selected, full width.
	if (selectedEmail) {
		return (
			<div className="flex h-full w-full flex-col">
				<div className="border-b border-border px-4 py-3">
					<button
						onClick={() => onSelectEmail(null)}
						className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
					>
						‹ All emails
					</button>
				</div>
				<div className="min-h-0 flex-1">
					<EmailDetail
						digest={asDigest}
						selectedEmailId={selectedEmailId}
						processing={false}
						onDelete={deleteEmail}
					/>
				</div>
			</div>
		);
	}

	// LIST PANE — full width, shown when nothing is selected.
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
					All emails
				</h2>
			</div>
			<div className="flex-1 overflow-y-auto">
				{emails.length === 0 && loading && (
					<p className="px-4 py-4 text-sm text-ink-soft">Loading…</p>
				)}
				{emails.length === 0 && !loading && !error && (
					<p className="px-4 py-4 text-sm text-ink-soft">No emails yet.</p>
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
							onSelect={() => {
								markAsRead(email.gmail_id);
								onSelectEmail(email.gmail_id);
							}}
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
