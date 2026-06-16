import { Digest, findEmailById } from "@/types";

interface EmailDetailProps {
	digest: Digest;
	selectedEmailId: string | null;
}

type Category = "IMPORTANT" | "ROUTINE" | "JUNK";

const CATEGORY_STYLE: Record<
	Category,
	{ label: string; text: string; bg: string }
> = {
	IMPORTANT: {
		label: "Important",
		text: "text-important",
		bg: "bg-important-soft",
	},
	ROUTINE: { label: "Routine", text: "text-routine", bg: "bg-routine-soft" },
	JUNK: { label: "Junk", text: "text-junk", bg: "bg-junk-soft" },
};

export default function EmailDetail({
	digest,
	selectedEmailId,
}: EmailDetailProps) {
	// Empty state: nothing selected -> show a small overview
	if (selectedEmailId === null) {
		return (
			<div className="flex h-full flex-col items-center justify-center px-6 text-center">
				<p className="text-sm text-ink-soft">
					{digest.total} email{digest.total === 1 ? "" : "s"} in this digest
				</p>
				<div className="mt-3 flex gap-4 text-xs text-ink-faint">
					<span>
						<span className="font-semibold text-important">
							{digest.buckets.IMPORTANT.length}
						</span>{" "}
						important
					</span>
					<span>
						<span className="font-semibold text-routine">
							{digest.buckets.ROUTINE.length}
						</span>{" "}
						routine
					</span>
					<span>
						<span className="font-semibold text-junk">
							{digest.buckets.JUNK.length}
						</span>{" "}
						junk
					</span>
				</div>
				<p className="mt-6 text-xs text-ink-faint">
					Select an email to read it
				</p>
			</div>
		);
	}

	const found = findEmailById(digest, selectedEmailId);

	// Edge case: selected id no longer exists in the digest
	if (found === null) {
		return (
			<div className="flex h-full items-center justify-center px-6">
				<p className="text-sm text-ink-faint">Email not found</p>
			</div>
		);
	}

	const { email, category } = found;
	const style = CATEGORY_STYLE[category];

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b border-border px-6 py-4">
				<span
					className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
				>
					{style.label}
				</span>
				<h2 className="mt-2 text-lg font-semibold leading-snug text-ink">
					{email.subject}
				</h2>
				<p className="mt-1 text-sm text-ink-soft">{email.sender}</p>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto px-6 py-5">
				<section className="mb-6">
					<h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
						Summary
					</h3>
					<p className="text-sm leading-relaxed text-ink">{email.summary}</p>
				</section>

				<section>
					<h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
						Why this category
					</h3>
					<p className="text-sm leading-relaxed text-ink-soft">
						{email.reason}
					</p>
				</section>
			</div>

			{/* Action area (placeholder — real actions come with Gmail write access) */}
			<div className="border-t border-border px-6 py-3">
				<div className="flex gap-2">
					<button
						disabled
						className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-faint cursor-not-allowed"
					>
						Reply
					</button>
					<button
						disabled
						className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-faint cursor-not-allowed"
					>
						Delete
					</button>
					<button
						disabled
						className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-faint cursor-not-allowed"
					>
						Open in Gmail
					</button>
				</div>
				<p className="mt-2 text-xs text-ink-faint">Actions coming soon</p>
			</div>
		</div>
	);
}
