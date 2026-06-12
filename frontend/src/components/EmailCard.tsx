import { EmailItem } from "@/types";

type Category = "IMPORTANT" | "ROUTINE" | "JUNK";

interface EmailCardProps {
	email: EmailItem;
	category: Category;
}

// Maps each category to its left-border color (using your tokens)
const BORDER_COLOR: Record<Category, string> = {
	IMPORTANT: "border-l-important",
	ROUTINE: "border-l-routine",
	JUNK: "border-l-junk",
};

export default function EmailCard({ email, category }: EmailCardProps) {
	return (
		<div
			className={`group rounded-md border border-border border-l-2 ${BORDER_COLOR[category]} bg-surface px-4 py-3 transition-colors hover:bg-surface-hover`}
		>
			<div className="mb-1 flex items-center justify-between gap-3">
				<span className="truncate text-xs text-ink-faint">{email.sender}</span>
			</div>

			<h3 className="mb-1 text-[15px] font-semibold leading-snug text-ink">
				{email.subject}
			</h3>

			<p className="mb-2 text-sm leading-relaxed text-ink-soft">
				{email.summary}
			</p>

			<p className="text-xs italic text-ink-faint">
				<span className="font-medium not-italic text-ink-faint">Why: </span>
				{email.reason}
			</p>
		</div>
	);
}
