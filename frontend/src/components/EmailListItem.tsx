import { motion } from "motion/react";
import { EmailItem } from "@/types";
import { staggerItem, springTransition } from "@/lib/motion";

type Category = "IMPORTANT" | "ROUTINE" | "JUNK";

interface EmailListItemProps {
	email: EmailItem;
	category: Category;
	isSelected: boolean;
	onSelect: () => void;
}

const BORDER_COLOR: Record<Category, string> = {
	IMPORTANT: "border-l-important",
	ROUTINE: "border-l-routine",
	JUNK: "border-l-junk",
};

// Format an ISO timestamp for a list row: "2:15 PM" if today, "Aug 24"
// otherwise. Uses the browser's own locale/timezone, so a UTC instant
// displays in the reader's local time (17:19Z → "10:19 AM" in Vancouver).
function formatReceived(iso: string | null | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	const now = new Date();
	const sameDay =
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate();
	return sameDay
		? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
		: d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function EmailListItem({
	email,
	category,
	isSelected,
	onSelect,
}: EmailListItemProps) {
	return (
		<motion.button
			variants={staggerItem}
			onClick={onSelect}
			className={`relative flex w-full flex-col items-start gap-0.5 border-l-2 ${BORDER_COLOR[category]} px-3 py-2 text-left transition-colors ${
				isSelected ? "" : "hover:bg-surface-hover"
			}`}
		>
			{/* Sliding selection highlight — shared layoutId animates it between rows */}
			{isSelected && (
				<motion.div
					layoutId="selection-highlight"
					transition={springTransition}
					className="absolute inset-0 rounded-sm bg-accent-soft"
					style={{ zIndex: 0 }}
				/>
			)}

			<span
				className={`relative z-10 flex w-full items-baseline justify-between gap-2 text-xs ${
					email.is_read ? "text-ink-faint" : "text-ink-soft"
				}`}
			>
				<span className="truncate">{email.sender}</span>
				<span className="shrink-0 font-mono text-[11px] text-ink-faint">
					{formatReceived(email.received_at)}
				</span>
			</span>
			<span
				className={`relative z-10 w-full truncate text-sm ${
					email.is_read ? "font-normal" : "font-semibold"
				} ${isSelected || !email.is_read ? "text-ink" : "text-ink-soft"}`}
			>
				{email.subject}
			</span>
		</motion.button>
	);
}
