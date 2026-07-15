"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

import { API_BASE } from "@/lib/config";

type Preferences = {
	profession: string;
	interests: string[];
	important_senders: string;
	important_keywords: string;
	important_examples: string;
	routine_examples: string;
	junk_examples: string;
};

type Persona = {
	key: string;
	label: string;
	description: string;
	seed: Preferences;
};

const EMPTY_PREFS: Preferences = {
	profession: "",
	interests: [],
	important_senders: "",
	important_keywords: "",
	important_examples: "",
	routine_examples: "",
	junk_examples: "",
};

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

export default function ProfilePage() {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();

	const [prefs, setPrefs] = useState<Preferences>(EMPTY_PREFS);
	const [personas, setPersonas] = useState<Persona[]>([]);
	const [interestOptions, setInterestOptions] = useState<string[]>([]);
	const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saveState, setSaveState] = useState<SaveState>("idle");

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!authLoading && user === null) {
			router.push("/login");
		}
	}, [authLoading, user, router]);

	// Load personas + existing preferences on mount
	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const [personasRes, prefsRes] = await Promise.all([
					fetch(`${API_BASE}/preferences/personas`, { credentials: "include" }),
					fetch(`${API_BASE}/preferences`, { credentials: "include" }),
				]);
				if (personasRes.ok) {
					const data = await personasRes.json();
					if (!cancelled) {
						setPersonas(data.personas ?? []);
						setInterestOptions(data.interest_options ?? []);
					}
				}
				if (prefsRes.ok) {
					const data = await prefsRes.json();
					if (!cancelled && data.preferences) {
						setPrefs({ ...EMPTY_PREFS, ...data.preferences });
					}
				}
			} catch {
				// non-critical; leave defaults
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
		setPrefs((p) => ({ ...p, [key]: value }));
		setSaveState("unsaved");
	}

	function toggleInterest(opt: string) {
		setPrefs((p) => {
			const has = p.interests.includes(opt);
			return {
				...p,
				interests: has
					? p.interests.filter((i) => i !== opt)
					: [...p.interests, opt],
			};
		});
		setSaveState("unsaved");
	}

	function applyPersona(persona: Persona) {
		setSelectedPersona(persona.key);
		setPrefs({ ...EMPTY_PREFS, ...persona.seed });
		setSaveState("unsaved");
	}

	async function save() {
		setSaveState("saving");
		try {
			const res = await fetch(`${API_BASE}/preferences`, {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(prefs),
			});
			if (!res.ok) throw new Error();
			setSaveState("saved");
		} catch {
			setSaveState("error");
		}
	}

	if (authLoading || user === null || loading) {
		return (
			<div className="flex h-screen items-center justify-center bg-canvas">
				<p className="text-sm text-ink-soft">Loading…</p>
			</div>
		);
	}

	const saveLabel: Record<SaveState, string> = {
		idle: "All changes saved",
		unsaved: "Unsaved changes",
		saving: "Saving…",
		saved: "Saved ✓",
		error: "Couldn't save — try again",
	};

	return (
		<div className="min-h-screen bg-canvas text-ink">
			{/* Top bar */}
			<div className="sticky top-0 z-20 border-b border-border bg-canvas/80 backdrop-blur-md">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
					<button
						onClick={() => router.push("/app")}
						className="flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
					>
						‹ Back to inbox
					</button>
					<div className="flex items-center gap-2">
						<svg width="20" height="20" viewBox="0 0 28 28" fill="none">
							<path
								d="M5 6h18M7 11h14M10 16h8M13 21h2"
								stroke="url(#siftLogo)"
								strokeWidth="2.2"
								strokeLinecap="round"
							/>
							<defs>
								<linearGradient id="siftLogo" x1="5" y1="6" x2="23" y2="21">
									<stop stopColor="#85a0ff" />
									<stop offset="1" stopColor="#e08bb4" />
								</linearGradient>
							</defs>
						</svg>
						<span className="text-sm font-semibold">Sift</span>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-3xl px-6">
				{/* Intro */}
				<div className="py-14">
					<p className="mb-3 font-mono text-xs uppercase tracking-wider text-accent">
						Your preferences
					</p>
					<h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
						Teach Sift what matters to you.
					</h1>
					<p className="max-w-xl text-lg text-ink-soft">
						The more specific you are, the sharper Sift gets. Name real people,
						real senders, real examples — Sift uses all of it to sort your inbox
						the way you would.
					</p>
				</div>

				{/* SECTION 1 — Who you are */}
				<section className="mb-11">
					<SectionHead
						title="Who you are"
						why="Sets the lens Sift reads your email through."
					/>
					<Field
						label="Start from a profile"
						hint="Pick the closest match — it fills in smart defaults you can edit. Not a commitment, just a head start."
					>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{personas.map((p) => (
								<button
									key={p.key}
									onClick={() => applyPersona(p)}
									className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
										selectedPersona === p.key
											? "border-accent bg-accent-soft"
											: "border-border bg-surface hover:border-accent"
									}`}
								>
									<div className="mb-0.5 text-sm font-semibold text-ink">
										{p.label}
									</div>
									<div className="text-xs text-ink-faint">{p.description}</div>
								</button>
							))}
						</div>
					</Field>

					<Field
						label="In your own words"
						hint='A sentence about your situation. "Job-seeking developer, new to Vancouver" tells Sift a lot.'
					>
						<TextInput
							value={prefs.profession}
							onChange={(v) => update("profession", v)}
							placeholder="e.g. Job-seeking software developer, new to Vancouver"
						/>
					</Field>

					<Field
						label="What are you into?"
						hint="Helps Sift judge promotional and newsletter email."
					>
						<div className="flex flex-wrap gap-2.5">
							{interestOptions.map((opt) => {
								const on = prefs.interests.includes(opt);
								return (
									<button
										key={opt}
										onClick={() => toggleInterest(opt)}
										className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
											on
												? "border-accent bg-accent-soft text-accent"
												: "border-border bg-surface text-ink-soft hover:border-accent hover:text-ink"
										}`}
									>
										{opt}
									</button>
								);
							})}
						</div>
					</Field>
				</section>

				<div className="mb-11 h-px bg-border" />

				{/* SECTION 2 — People who matter */}
				<section className="mb-11">
					<SectionHead
						title="The people who matter"
						why="The single most useful thing you can tell Sift."
					/>
					<Field
						label="Who should always reach you?"
						hint="Names, email addresses, or whole domains. Your boss, clients, family, your school. Anything from these is treated as important."
					>
						<TextArea
							value={prefs.important_senders}
							onChange={(v) => update("important_senders", v)}
							placeholder="e.g. my manager Gurpreet, anything from @langara.ca, recruiters, my mom"
						/>
					</Field>
					<Field
						label="Words that signal something important"
						hint="Optional. Terms that, when they show up, usually mean you need to look."
					>
						<TextInput
							value={prefs.important_keywords}
							onChange={(v) => update("important_keywords", v)}
							placeholder="e.g. interview, offer, deadline, invoice, appointment"
						/>
					</Field>
				</section>

				<div className="mb-11 h-px bg-border" />

				{/* SECTION 3 — Teach the three categories */}
				<section className="mb-8">
					<SectionHead
						title="Teach Sift your judgment"
						why="Concrete examples for each bucket. The more specific, the better."
					/>

					<CategoryCard
						color="important"
						title="Always reach me — Important"
						hint="What you never want to miss. Be specific about the kinds of email and who they're from."
						value={prefs.important_examples}
						onChange={(v) => update("important_examples", v)}
						placeholder="e.g. interview invites and replies to jobs I applied for; anything from my manager; bank alerts; messages from real people I know"
					/>
					<CategoryCard
						color="routine"
						title="Good to see, not urgent — Routine"
						hint="Real and worth keeping, but nothing you need to act on right now."
						value={prefs.routine_examples}
						onChange={(v) => update("routine_examples", v)}
						placeholder="e.g. receipts and order confirmations; shipping updates; newsletters I actually read; pay statements"
					/>
					<CategoryCard
						color="junk"
						title="Just noise — Junk"
						hint="What you'd never miss if it quietly disappeared. Sift only labels — it never deletes."
						value={prefs.junk_examples}
						onChange={(v) => update("junk_examples", v)}
						placeholder="e.g. marketing and promos; cold sales outreach; job digests with nothing relevant; social notification emails"
					/>
				</section>

				{/* Save bar */}
				<div className="sticky bottom-0 flex items-center justify-between gap-4 bg-linear-to-t from-canvas from-40% to-transparent py-6">
					<span
						className={`font-mono text-sm ${
							saveState === "saved"
								? "text-routine"
								: saveState === "error"
									? "text-important"
									: "text-ink-faint"
						}`}
					>
						{saveLabel[saveState]}
					</span>
					<button
						onClick={save}
						disabled={saveState === "saving"}
						className="rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-accent-hover hover:-translate-y-0.5 disabled:opacity-60"
					>
						Save preferences
					</button>
				</div>
			</div>
		</div>
	);
}

/* ---- small presentational helpers ---- */

function SectionHead({ title, why }: { title: string; why: string }) {
	return (
		<div className="mb-5">
			<h2 className="mb-1 text-xl font-semibold tracking-tight">{title}</h2>
			<p className="text-sm text-ink-faint">{why}</p>
		</div>
	);
}

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mb-5">
			<label className="mb-1 block text-sm font-semibold text-ink">
				{label}
			</label>
			<p className="mb-2.5 text-xs text-ink-faint">{hint}</p>
			{children}
		</div>
	);
}

function TextInput({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
}) {
	return (
		<input
			type="text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
		/>
	);
}

function TextArea({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
}) {
	return (
		<textarea
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className="min-h-24 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
		/>
	);
}

function CategoryCard({
	color,
	title,
	hint,
	value,
	onChange,
	placeholder,
}: {
	color: "important" | "routine" | "junk";
	title: string;
	hint: string;
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
}) {
	const borderColor = {
		important: "border-l-important",
		routine: "border-l-routine",
		junk: "border-l-junk",
	}[color];
	const dotColor = {
		important: "bg-important",
		routine: "bg-routine",
		junk: "bg-junk",
	}[color];

	return (
		<div
			className={`mb-3.5 rounded-2xl border border-l-[3px] border-border ${borderColor} bg-surface p-5`}
		>
			<div className="mb-1 flex items-center gap-2.5">
				<span className={`h-2 w-2 rounded-full ${dotColor}`} />
				<span className="text-sm font-semibold">{title}</span>
			</div>
			<p className="mb-3 text-xs text-ink-faint">{hint}</p>
			<TextArea value={value} onChange={onChange} placeholder={placeholder} />
		</div>
	);
}
