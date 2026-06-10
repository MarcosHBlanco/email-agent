import { Digest } from "@/types";
import EmailCard from "@/components/EmailCard";

type CategoryFilter = "ALL" | "IMPORTANT" | "ROUTINE" | "JUNK";

interface DigestViewProps {
	digest: Digest;
	selected: CategoryFilter;
}

const ALL_CATEGORIES = ["IMPORTANT", "ROUTINE", "JUNK"] as const;

export default function DigestView({ digest, selected }: DigestViewProps) {
	// Decide which categories to show: all three if "ALL", otherwise just the one.
	const categoriesToShow = selected === "ALL" ? ALL_CATEGORIES : [selected];

	return (
		<div>
			<p style={{ color: "#666", marginBottom: "16px" }}>
				{digest.total} emails processed
			</p>

			{categoriesToShow.map((category) => {
				const items = digest.buckets[category];
				return (
					<section key={category} style={{ marginBottom: "28px" }}>
						<h2
							style={{ fontSize: "16px", color: "#222", marginBottom: "12px" }}
						>
							{category} ({items.length})
						</h2>

						{items.length === 0 ? (
							<p style={{ color: "#999", fontStyle: "italic" }}>None</p>
						) : (
							items.map((email, index) => (
								<EmailCard key={index} email={email} />
							))
						)}
					</section>
				);
			})}
		</div>
	);
}
