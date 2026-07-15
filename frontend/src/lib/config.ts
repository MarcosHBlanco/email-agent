// Single source of truth for the backend API base URL.
//
// NEXT_PUBLIC_ prefix is required for Next.js to expose this to browser code.
// The value is baked in at BUILD time, not read at runtime — so changing it
// requires a rebuild. Safe to be public: it's just a URL, visible in any
// network tab. Never put secrets in a NEXT_PUBLIC_ variable.
export const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
