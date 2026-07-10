// Describes the shape of the data returned by the /digest API endpoint.
// Mirrors the JSON contract from the FastAPI backend.

export interface EmailItem {
	gmail_id: string;
	sender: string;
	subject: string;
	summary: string;
	reason: string;
	is_read: boolean;
}

export interface DigestBuckets {
	IMPORTANT: EmailItem[];
	ROUTINE: EmailItem[];
	JUNK: EmailItem[];
}

export interface Digest {
	total: number;
	generated_at: string;
	buckets: DigestBuckets;
}

export interface DailyAnalytics {
	date: string;
	IMPORTANT: number;
	ROUTINE: number;
	JUNK: number;
	total: number;
}

// Find an email by its gmail_id across all buckets. Returns the email and its
// category (needed for the detail panel's color coding), or null if not found.
export function findEmailById(
	digest: Digest,
	gmailId: string,
): { email: EmailItem; category: keyof DigestBuckets } | null {
	const categories: (keyof DigestBuckets)[] = ["IMPORTANT", "ROUTINE", "JUNK"];
	for (const category of categories) {
		const email = digest.buckets[category].find((e) => e.gmail_id === gmailId);
		if (email) {
			return { email, category };
		}
	}
	return null;
}

// Return a NEW digest with one email marked read. Pure — never mutates.
// React compares by object identity to decide what re-renders, so mutating
// the existing digest in place would flip the data without updating the UI.
export function markEmailReadInDigest(digest: Digest, gmailId: string): Digest {
	const categories: (keyof DigestBuckets)[] = ["IMPORTANT", "ROUTINE", "JUNK"];
	const buckets = {} as DigestBuckets;
	for (const category of categories) {
		buckets[category] = digest.buckets[category].map((e) =>
			e.gmail_id === gmailId ? { ...e, is_read: true } : e,
		);
	}
	return { ...digest, buckets };
}
