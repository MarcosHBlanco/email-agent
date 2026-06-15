// Describes the shape of the data returned by the /digest API endpoint.
// Mirrors the JSON contract from the FastAPI backend.

export interface EmailItem {
	gmail_id: string;
	sender: string;
	subject: string;
	summary: string;
	reason: string;
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
