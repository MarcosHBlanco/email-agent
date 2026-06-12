import { useState } from "react";
import { Digest } from "@/types";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";

interface RailProps {
	digest: Digest | null;
	selected: CategoryFilter;
	onSelect: (category: CategoryFilter) => void;
	onProcess: () => void;
	processing: boolean;
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
}: RailProps) {
	const [digestOpen, setDigestOpen] = useState(true);

	function countFor(key: CategoryFilter): number {
		if (!digest) return 0;
		if (key === "ALL") return digest.total;
		return digest.buckets[key].length;
	}

	return (
		<nav className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-canvas">
			{/* App title */}
			<div className="px-4 py-3.5 border-b border-border">
				<h1 className="text-sm font-semibold text-ink">Email Agent</h1>
			</div>

			{/* Nav sections */}
			<div className="flex-1 overflow-y-auto px-2 py-3">
				{/* DIGEST (expandable) */}
				<button
					onClick={() => setDigestOpen((o) => !o)}
					className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
				>
					<span
						className={`text-ink-faint transition-transform ${digestOpen ? "rotate-90" : ""}`}
					>
						▸
					</span>
					Digest
				</button>

				{digestOpen && (
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

				{/* CALENDAR (coming soon) */}
				<div className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-faint cursor-not-allowed">
					<span>▸</span>
					Calendar
					<span className="ml-auto rounded bg-junk-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
						Soon
					</span>
				</div>

				{/* CHART (coming soon) */}
				<div className="mt-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-faint cursor-not-allowed">
					<span>▸</span>
					Chart
					<span className="ml-auto rounded bg-junk-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
						Soon
					</span>
				</div>
			</div>

			{/* Process button (bottom) */}
			<div className="border-t border-border p-3">
				<button
					onClick={onProcess}
					disabled={processing}
					className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
				>
					{processing ? "Processing…" : "Process new emails"}
				</button>
			</div>
		</nav>
	);
}
