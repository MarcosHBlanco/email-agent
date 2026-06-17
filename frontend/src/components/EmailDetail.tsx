import { AnimatePresence, motion } from "motion/react";
import { Digest, EmailItem, findEmailById } from "@/types";
import { fadeInUp, transition } from "@/lib/motion";

interface EmailDetailProps {
	digest: Digest;
	selectedEmailId: string | null;
	processing: boolean;
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
	processing,
}: EmailDetailProps) {
	const found =
		selectedEmailId !== null ? findEmailById(digest, selectedEmailId) : null;

	const viewKey = processing ? "processing" : (selectedEmailId ?? "empty");

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={viewKey}
				variants={fadeInUp}
				initial="hidden"
				animate="visible"
				exit="hidden"
				transition={transition}
				className="h-full"
			>
				{processing ? (
					<ProcessingState />
				) : selectedEmailId === null ? (
					<EmptyState digest={digest} />
				) : found === null ? (
					<NotFoundState />
				) : (
					<EmailContent email={found.email} category={found.category} />
				)}
			</motion.div>
		</AnimatePresence>
	);
}

function EmptyState({ digest }: { digest: Digest }) {
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
			<p className="mt-6 text-xs text-ink-faint">Select an email to read it</p>
		</div>
	);
}

function NotFoundState() {
	return (
		<div className="flex h-full items-center justify-center px-6">
			<p className="text-sm text-ink-faint">Email not found</p>
		</div>
	);
}

function ProcessingState() {
	return (
		<div className="flex h-full flex-col items-center justify-center px-6 text-center">
			<motion.div
				className="flex gap-1.5"
				initial="hidden"
				animate="visible"
				variants={{
					visible: {
						transition: {
							staggerChildren: 0.15,
							repeat: Infinity,
							repeatDelay: 0.3,
						},
					},
				}}
			>
				{[0, 1, 2].map((i) => (
					<motion.span
						key={i}
						className="h-2.5 w-2.5 rounded-full bg-accent"
						variants={{
							hidden: { opacity: 0.3, scale: 0.8 },
							visible: { opacity: 1, scale: 1 },
						}}
						transition={{
							duration: 0.4,
							repeat: Infinity,
							repeatType: "reverse",
						}}
					/>
				))}
			</motion.div>

			<p className="mt-5 text-sm font-medium text-ink">
				Processing your emails
			</p>
			<p className="mt-1 text-xs text-ink-faint">
				Fetching and categorizing — this can take up to a minute
			</p>
		</div>
	);
}

function EmailContent({
	email,
	category,
}: {
	email: EmailItem;
	category: Category;
}) {
	const style = CATEGORY_STYLE[category];
	return (
		<div className="flex h-full flex-col">
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
