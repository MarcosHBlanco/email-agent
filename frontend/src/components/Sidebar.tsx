import { Digest } from "@/types";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";

interface SidebarProps {
	digest: Digest | null;
	selected: CategoryFilter;
	onSelect: (category: CategoryFilter) => void;
}

const ITEMS: CategoryFilter[] = ["ALL", "IMPORTANT", "ROUTINE", "JUNK"];

// Maps each category to its accent color token (for the dot + active border)
const DOT_COLOR: Record<CategoryFilter, string> = {
	ALL: "bg-accent",
	IMPORTANT: "bg-important",
	ROUTINE: "bg-routine",
	JUNK: "bg-junk",
};

export default function Sidebar({ digest, selected, onSelect }: SidebarProps) {
	function countFor(item: CategoryFilter): number {
		if (!digest) return 0;
		if (item === "ALL") return digest.total;
		return digest.buckets[item].length;
	}

	return (
		<nav className="w-60 shrink-0 border-r border-border bg-canvas min-h-screen px-3 py-5">
			<h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-ink-faint mb-3">
				Categories
			</h2>

			<ul className="space-y-0.5">
				{ITEMS.map((item) => {
					const isActive = selected === item;
					return (
						<li key={item}>
							<button
								onClick={() => onSelect(item)}
								className={`group relative flex w-full items-center justify-between rounded-md px-3 py-2 text-[15px] transition-colors ${
									isActive
										? "bg-surface text-ink font-semibold shadow-sm"
										: "text-ink-soft hover:bg-surface-hover hover:text-ink"
								}`}
							>
								{/* active left accent bar */}
								{isActive && (
									<span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-0.5 rounded-full bg-accent" />
								)}

								<span className="flex items-center gap-2.5">
									<span className={`h-2 w-2 rounded-full ${DOT_COLOR[item]}`} />
									{item.charAt(0) + item.slice(1).toLowerCase()}
								</span>

								<span
									className={`text-sm tabular-nums ${
										isActive ? "text-ink-soft" : "text-ink-faint"
									}`}
								>
									{countFor(item)}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
