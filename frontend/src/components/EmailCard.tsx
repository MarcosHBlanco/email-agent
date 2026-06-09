import { EmailItem } from "@/types";

interface EmailCardProps {
	email: EmailItem;
}

export default function EmailCard({ email }: EmailCardProps) {
	return (
		<div
			style={{
				border: "1px solid #ddd",
				borderRadius: "6px",
				padding: "12px 16px",
				marginBottom: "10px",
				background: "#fff",
			}}
		>
			<div style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
				{email.sender}
			</div>
			<div style={{ fontWeight: 600, color: "#222", marginBottom: "6px" }}>
				{email.subject}
			</div>
			<div style={{ fontSize: "14px", color: "#333", marginBottom: "8px" }}>
				{email.summary}
			</div>
			<div style={{ fontSize: "12px", color: "#888", fontStyle: "italic" }}>
				Why: {email.reason}
			</div>
		</div>
	);
}
