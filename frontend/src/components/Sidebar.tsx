import { Digest } from "@/types";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";

interface SidebarProps {
	digest: Digest | null;
	selected: CategoryFilter;
	onSelect: (category: CategoryFilter) => void;
}

const ITEMS: CategoryFilter[] = ["ALL", "IMPORTANT", "ROUTINE", "JUNK"];

export default function Sidebar({ digest, selected, onSelect }: SidebarProps) {
	function countFor(item: CategoryFilter): number {
		if (!digest) return 0;
		if (item === "ALL") return digest.total;
		return digest.buckets[item].length;
	}

	return (
		<nav
			style={{
				width: "200px",
				borderRight: "1px solid #ddd",
				padding: "16px",
				background: "#fafafa",
				minHeight: "100vh",
			}}
		>
			<h2 style={{ fontSize: "14px", color: "#888", marginBottom: "16px" }}>
				CATEGORIES
			</h2>

			{ITEMS.map((item) => (
				<button
					key={item}
					onClick={() => onSelect(item)}
					style={{
						display: "block",
						width: "100%",
						textAlign: "left",
						padding: "8px 12px",
						marginBottom: "4px",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						background: selected === item ? "#e0e7ef" : "transparent",
						color: "#222",
						fontWeight: selected === item ? 600 : 400,
					}}
				>
					{item} ({countFor(item)})
				</button>
			))}
		</nav>
	);
}
