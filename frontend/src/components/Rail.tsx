import { useState } from "react";
import { Digest } from "@/types";
import { motion } from "motion/react";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";
type AppMode = "digest" | "calendar" | "chart";

interface RailProps {
	digest: Digest | null;
	selected: CategoryFilter;
	onSelect: (category: CategoryFilter) => void;
	onProcess: () => void;
	processing: boolean;
	activeMode: AppMode;
	onModeChange: (mode: AppMode) => void;
}

const CATEGORIES: { key: CategoryFilter; label: string; dot: string }[] = [
	{ key: "ALL", label: "All", dot: "bg-accent" },
	{ key: "IMPORTANT", label: "Important", dot: "bg-important" },
	{ key: "ROUTINE", label: "Routine", dot: "bg-routine" },
	{ key: "JUNK", label: "Junk", dot: "bg-junk" },
];

export default function Rail({
	digest,
	selected,
	onSelect,
	onProcess,
	processing,
	activeMode,
	onModeChange,
}: RailProps) {
	const [digestOpen, setDigestOpen] = useState(true);

	function countFor(key: CategoryFilter): number {
		if (!digest) return 0;
		if (key === "ALL") return digest.total;
		return digest.buckets[key].length;
	}

	const digestActive = activeMode === "digest";

	return (
		<nav className="flex h-full w-full flex-col border-r border-border bg-canvas md:w-60 md:shrink-0">
			{/* Nav sections */}
			<div className="flex-1 overflow-y-auto px-2 py-3">
				{/* DIGEST — mode switcher + expandable categories */}
				<button
					onClick={() => {
						onModeChange("digest");
						setDigestOpen(true);
					}}
					className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
						digestActive
							? "bg-surface text-ink shadow-sm"
							: "text-ink-soft hover:bg-surface-hover hover:text-ink"
					}`}
				>
					<span
						className={`text-ink-faint transition-transform ${digestActive && digestOpen ? "rotate-90" : ""}`}
					>
						▸
					</span>
					Digest
				</button>

				{/* Categories — only in digest mode */}
				{digestActive && digestOpen && (
					<ul className="mt-0.5 space-y-0.5 pl-2">
						{CATEGORIES.map(({ key, label, dot }) => {
							const isActive = selected === key;
							return (
								<li key={key}>
									<button
										onClick={() => onSelect(key)}
										className={`relative flex w-full items-center justify-between rounded-md py-1.5 pl-5 pr-2 text-[15px] transition-colors ${
											isActive
												? "bg-surface font-semibold text-ink shadow-sm"
												: "text-ink-soft hover:bg-surface-hover hover:text-ink"
										}`}
									>
										{isActive && (
											<span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
										)}
										<span className="flex items-center gap-2.5">
											<span className={`h-2 w-2 rounded-full ${dot}`} />
											{label}
										</span>
										<span
											className={`text-sm tabular-nums ${isActive ? "text-ink-soft" : "text-ink-faint"}`}
										>
											{countFor(key)}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				)}

				{/* CALENDAR — mode switcher */}
				<button
					onClick={() => onModeChange("calendar")}
					className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
						activeMode === "calendar"
							? "bg-surface text-ink shadow-sm"
							: "text-ink-soft hover:bg-surface-hover hover:text-ink"
					}`}
				>
					<span className="text-ink-faint">▸</span>
					Calendar
				</button>

				{/* CHART — mode switcher */}
				<button
					onClick={() => onModeChange("chart")}
					className={`mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
						activeMode === "chart"
							? "bg-surface text-ink shadow-sm"
							: "text-ink-soft hover:bg-surface-hover hover:text-ink"
					}`}
				>
					<span className="text-ink-faint">▸</span>
					Chart
				</button>
			</div>

			{/* Process button (bottom) */}
			<div className="border-t border-border p-3">
				<motion.button
					onClick={onProcess}
					disabled={processing}
					whileTap={{ scale: 0.97 }}
					className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_-2px_var(--color-accent)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_6px_28px_-2px_var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_20px_-2px_var(--color-accent)]"
				>
					{processing ? "Processing…" : "Process new emails"}
				</motion.button>
			</div>
		</nav>
	);
}
