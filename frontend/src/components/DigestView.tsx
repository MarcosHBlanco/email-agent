import { Digest } from "@/types";
import EmailCard from "@/components/EmailCard";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";
type Category = "IMPORTANT" | "ROUTINE" | "JUNK";

interface DigestViewProps {
	digest: Digest;
	selected: CategoryFilter;
}

const ALL_CATEGORIES: Category[] = ["IMPORTANT", "ROUTINE", "JUNK"];

// Category -> heading dot color (matches sidebar + card borders)
const DOT_COLOR: Record<Category, string> = {
	IMPORTANT: "bg-important",
	ROUTINE: "bg-routine",
	JUNK: "bg-junk",
};

export default function DigestView({ digest, selected }: DigestViewProps) {
	const categoriesToShow =
		selected === "ALL" ? ALL_CATEGORIES : [selected as Category];

	return (
		<div className="space-y-8">
			{categoriesToShow.map((category) => {
				const items = digest.buckets[category];
				return (
					<section key={category}>
						<div className="mb-3 flex items-center gap-2">
							<span className={`h-2 w-2 rounded-full ${DOT_COLOR[category]}`} />
							<h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
								{category}
							</h2>
							<span className="text-xs tabular-nums text-ink-faint">
								{items.length}
							</span>
						</div>

						{items.length === 0 ? (
							<p className="pl-4 text-sm italic text-ink-faint">Nothing here</p>
						) : (
							<div className="space-y-2">
								{items.map((email, index) => (
									<EmailCard key={index} email={email} category={category} />
								))}
							</div>
						)}
					</section>
				);
			})}
		</div>
	);
}
