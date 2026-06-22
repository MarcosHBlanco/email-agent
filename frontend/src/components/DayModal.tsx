"use client";

import { AnimatePresence, motion } from "motion/react";
import { DailyAnalytics } from "@/types";

interface DayModalProps {
	day: DailyAnalytics | null; // the day to show, or null when closed
	onClose: () => void;
}

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function formatDate(dateStr: string): string {
	// "2026-06-15" -> "June 15, 2026"
	const [year, month, day] = dateStr.split("-").map((s) => Number(s));
	return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

export default function DayModal({ day, onClose }: DayModalProps) {
	return (
		<AnimatePresence>
			{day !== null && (
				<>
					{/* Backdrop — tap to close */}
					<motion.div
						className="fixed inset-0 z-40 bg-black/50 md:hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onClose}
					/>

					{/* Bottom sheet */}
					<motion.div
						className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-surface p-5 pb-8 md:hidden"
						initial={{ y: "100%" }}
						animate={{ y: 0 }}
						exit={{ y: "100%" }}
						transition={{ type: "spring", stiffness: 400, damping: 36 }}
					>
						{/* Grab handle */}
						<div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />

						{/* Date heading */}
						<h2 className="text-base font-semibold text-ink">
							{formatDate(day.date)}
						</h2>
						<p className="mt-0.5 text-sm text-ink-soft">
							{day.total} email{day.total === 1 ? "" : "s"} processed
						</p>

						{/* Category breakdown */}
						<div className="mt-5 flex flex-col gap-3">
							<CategoryRow
								label="Important"
								count={day.IMPORTANT}
								dot="bg-important"
							/>
							<CategoryRow
								label="Routine"
								count={day.ROUTINE}
								dot="bg-routine"
							/>
							<CategoryRow label="Junk" count={day.JUNK} dot="bg-junk" />
						</div>

						{/* Composition bar */}
						<div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-canvas">
							{day.IMPORTANT > 0 && (
								<div className="bg-important" style={{ flex: day.IMPORTANT }} />
							)}
							{day.ROUTINE > 0 && (
								<div className="bg-routine" style={{ flex: day.ROUTINE }} />
							)}
							{day.JUNK > 0 && (
								<div className="bg-junk" style={{ flex: day.JUNK }} />
							)}
						</div>

						{/* Close button */}
						<button
							onClick={onClose}
							className="mt-6 w-full rounded-lg bg-surface-hover py-2.5 text-sm font-medium text-ink transition-colors hover:bg-border"
						>
							Close
						</button>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

function CategoryRow({
	label,
	count,
	dot,
}: {
	label: string;
	count: number;
	dot: string;
}) {
	return (
		<div className="flex items-center gap-2.5">
			<span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
			<span className="text-sm text-ink-soft">{label}</span>
			<span className="ml-auto text-sm font-semibold tabular-nums text-ink">
				{count}
			</span>
		</div>
	);
}
