import { Digest } from "@/types";
import EmailListItem from "@/components/EmailListItem";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";
type Category = "IMPORTANT" | "ROUTINE" | "JUNK";

interface EmailListProps {
	digest: Digest;
	selected: CategoryFilter;
	selectedEmailId: string | null;
	onSelectEmail: (gmailId: string) => void;
}

const ALL_CATEGORIES: Category[] = ["IMPORTANT", "ROUTINE", "JUNK"];

const DOT_COLOR: Record<Category, string> = {
	IMPORTANT: "bg-important",
	ROUTINE: "bg-routine",
	JUNK: "bg-junk",
};

export default function EmailList({
	digest,
	selected,
	selectedEmailId,
	onSelectEmail,
}: EmailListProps) {
	const categoriesToShow =
		selected === "ALL" ? ALL_CATEGORIES : [selected as Category];

	return (
		<div className="divide-y divide-border">
			{categoriesToShow.map((category) => {
				const items = digest.buckets[category];
				return (
					<section key={category} className="py-2">
						<div className="flex items-center gap-2 px-3 py-1.5">
							<span className={`h-2 w-2 rounded-full ${DOT_COLOR[category]}`} />
							<h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
								{category}
							</h2>
							<span className="text-xs tabular-nums text-ink-faint">
								{items.length}
							</span>
						</div>

						{items.length === 0 ? (
							<p className="px-3 py-1 text-sm italic text-ink-faint">
								Nothing here
							</p>
						) : (
							<div>
								{items.map((email) => (
									<EmailListItem
										key={email.gmail_id}
										email={email}
										category={category}
										isSelected={email.gmail_id === selectedEmailId}
										onSelect={() => onSelectEmail(email.gmail_id)}
									/>
								))}
							</div>
						)}
					</section>
				);
			})}
		</div>
	);
}
