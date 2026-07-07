/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const API_BASE = "http://localhost:8000";

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

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();

	const [step, setStep] = useState(0);
	const [prefs, setPrefs] = useState<Preferences>(EMPTY_PREFS);
	const [personas, setPersonas] = useState<Persona[]>([]);
	const [interestOptions, setInterestOptions] = useState<string[]>([]);
	const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!authLoading && user === null) {
			router.push("/login");
		}
	}, [authLoading, user, router]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const res = await fetch(`${API_BASE}/preferences/personas`, {
					credentials: "include",
				});
				if (res.ok) {
					const data = await res.json();
					if (!cancelled) {
						setPersonas(data.personas ?? []);
						setInterestOptions(data.interest_options ?? []);
					}
				}
			} catch {
				// non-critical
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
	}

	function applyPersona(persona: Persona) {
		setSelectedPersona(persona.key);
		setPrefs({ ...EMPTY_PREFS, ...persona.seed });
	}

	async function completeOnboarding() {
		setSaving(true);
		try {
			await fetch(`${API_BASE}/preferences`, {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(prefs),
			});
		} catch {
			// even if save fails, don't trap them here
		}
		router.push("/app");
	}

	const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
	const back = () => setStep((s) => Math.max(s - 1, 0));

	if (authLoading || user === null || loading) {
		return (
			<div className="flex h-screen items-center justify-center bg-canvas">
				<p className="text-sm text-ink-soft">Loading…</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-canvas text-ink">
			<div className="mx-auto w-full max-w-2xl px-6 pt-8">
				<div className="mb-8 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<svg width="22" height="22" viewBox="0 0 28 28" fill="none">
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
						<span className="font-semibold">Sift</span>
					</div>
					<button
						onClick={completeOnboarding}
						className="text-sm text-ink-faint transition-colors hover:text-ink-soft"
					>
						Skip for now
					</button>
				</div>

				<div className="mb-2 flex gap-2">
					{Array.from({ length: TOTAL_STEPS }).map((_, i) => (
						<div
							key={i}
							className={`h-1 flex-1 rounded-full transition-colors ${
								i <= step ? "bg-accent" : "bg-border"
							}`}
						/>
					))}
				</div>
				<p className="font-mono text-xs text-ink-faint">
					Step {step + 1} of {TOTAL_STEPS}
				</p>
			</div>

			<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
				{step === 0 && (
					<Step
						title="Let's set up Sift."
						subtitle="First, which of these sounds most like you? It gives Sift a smart starting point — you can change everything next."
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
					</Step>
				)}

				{step === 1 && (
					<Step
						title="Who should always reach you?"
						subtitle="The most useful thing you can tell Sift. Name real people, email addresses, or whole domains — anything from them is treated as important."
					>
						<TextArea
							value={prefs.important_senders}
							onChange={(v) => update("important_senders", v)}
							placeholder="e.g. my manager Gurpreet, anything from @langara.ca, recruiters, my mom"
							autoFocus
						/>
						<p className="mt-3 text-xs text-ink-faint">
							The more specific you are here, the fewer important emails Sift
							will ever miss.
						</p>
					</Step>
				)}

				{step === 2 && (
					<Step
						title="What matters to you?"
						subtitle="A little about your situation and what you care about, so Sift can judge the grey-area email."
					>
						<label className="mb-1 block text-sm font-semibold text-ink">
							In your own words
						</label>
						<input
							type="text"
							value={prefs.profession}
							onChange={(e) => update("profession", e.target.value)}
							placeholder="e.g. Job-seeking software developer, new to Vancouver"
							className="mb-6 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
						/>
						<label className="mb-2 block text-sm font-semibold text-ink">
							What are you into?
						</label>
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
					</Step>
				)}

				{step === 3 && (
					<Step
						title="Fine-tune the buckets."
						subtitle="We've pre-filled these based on your profile. Tweak them to match how you actually think about your inbox."
					>
						<div className="space-y-4">
							<CatField
								color="bg-important"
								label="Always reach me — Important"
								value={prefs.important_examples}
								onChange={(v) => update("important_examples", v)}
								placeholder="What you never want to miss…"
							/>
							<CatField
								color="bg-routine"
								label="Good to see, not urgent — Routine"
								value={prefs.routine_examples}
								onChange={(v) => update("routine_examples", v)}
								placeholder="Real, but nothing to act on right now…"
							/>
							<CatField
								color="bg-junk"
								label="Just noise — Junk"
								value={prefs.junk_examples}
								onChange={(v) => update("junk_examples", v)}
								placeholder="What you'd never miss…"
							/>
						</div>
					</Step>
				)}

				{step === 4 && (
					<Step
						title="You're all set."
						subtitle="Sift now knows what matters to you. It'll sort your inbox from here — and the more you use it, the sharper it gets. You can refine all of this anytime from your preferences."
					>
						<div className="rounded-2xl border border-border bg-surface p-5">
							<p className="mb-3 text-sm font-semibold text-ink">
								Here's what Sift learned:
							</p>
							<ul className="space-y-2 text-sm text-ink-soft">
								{prefs.profession && (
									<li>
										<span className="text-ink-faint">You: </span>
										{prefs.profession}
									</li>
								)}
								{prefs.important_senders && (
									<li>
										<span className="text-ink-faint">Always important: </span>
										{prefs.important_senders}
									</li>
								)}
								{prefs.interests.length > 0 && (
									<li>
										<span className="text-ink-faint">Interests: </span>
										{prefs.interests.join(", ")}
									</li>
								)}
							</ul>
						</div>
					</Step>
				)}
			</div>

			<div className="mx-auto w-full max-w-2xl px-6 pb-10">
				<div className="flex items-center justify-between">
					{step > 0 ? (
						<button
							onClick={back}
							className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
						>
							Back
						</button>
					) : (
						<div />
					)}

					{step < TOTAL_STEPS - 1 ? (
						<button
							onClick={next}
							className="rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
						>
							Continue
						</button>
					) : (
						<button
							onClick={completeOnboarding}
							disabled={saving}
							className="rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-accent-hover disabled:opacity-60"
						>
							{saving ? "Saving…" : "Start using Sift"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function Step({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
				{title}
			</h1>
			<p className="mb-8 text-lg text-ink-soft">{subtitle}</p>
			{children}
		</div>
	);
}

function TextArea({
	value,
	onChange,
	placeholder,
	autoFocus,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	autoFocus?: boolean;
}) {
	return (
		<textarea
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			autoFocus={autoFocus}
			className="min-h-28 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
		/>
	);
}

function CatField({
	color,
	label,
	value,
	onChange,
	placeholder,
}: {
	color: string;
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
}) {
	return (
		<div>
			<div className="mb-1.5 flex items-center gap-2">
				<span className={`h-2 w-2 rounded-full ${color}`} />
				<span className="text-sm font-semibold text-ink">{label}</span>
			</div>
			<textarea
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="min-h-20 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
			/>
		</div>
	);
}
