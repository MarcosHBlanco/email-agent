import { EmailItem } from "@/types";
import { motion } from "motion/react";
import { staggerItem } from "@/lib/motion";

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
			className={`flex w-full flex-col items-start gap-0.5 border-l-2 ${BORDER_COLOR[category]} mb-1 px-3 py-2 text-left transition-colors ${
				isSelected ? "bg-accent-soft" : "hover:bg-surface-hover"
			}`}
		>
			<span className="w-full truncate text-xs text-ink-faint">
				{email.sender}
			</span>
			<span
				className={`w-full truncate text-sm ${
					isSelected ? "font-semibold text-ink" : "text-ink-soft"
				}`}
			>
				{email.subject}
			</span>
		</motion.button>
	);
}
