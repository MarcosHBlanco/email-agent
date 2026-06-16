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
			className={`relative flex w-full flex-col items-start gap-0.5 border-l-2 ${BORDER_COLOR[category]} px-3 py-2 text-left ${
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

			<span className="relative z-10 w-full truncate text-xs text-ink-faint">
				{email.sender}
			</span>
			<span
				className={`relative z-10 w-full truncate text-sm ${
					isSelected ? "font-semibold text-ink" : "text-ink-soft"
				}`}
			>
				{email.subject}
			</span>
		</motion.button>
	);
}
