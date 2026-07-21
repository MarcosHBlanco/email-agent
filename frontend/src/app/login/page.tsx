"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
	const { login, signup } = useAuth();
	const router = useRouter();

	const [mode, setMode] = useState<"login" | "signup">("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit() {
		setError(null);
		setSubmitting(true);
		try {
			if (mode === "login") {
				await login(email, password);
			} else {
				await signup(email, password);
			}
			router.push("/app"); // success → go to the app
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4">
			{/* Soft accent glow behind the card — echoes the landing page's hero */}
			<div
				className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px]"
				style={{
					background:
						"radial-gradient(circle, var(--color-accent) 0%, transparent 65%)",
				}}
			/>

			<div className="relative w-full max-w-sm">
				<div className="mb-7 text-center">
					<h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
						Sift
					</h1>
					<p className="mt-2 text-sm text-ink-soft">
						{mode === "login"
							? "Welcome back."
							: "See what matters. Sift the rest."}
					</p>
				</div>

				<div className="rounded-2xl border border-border bg-surface p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
					<div className="flex flex-col gap-4">
						<label className="flex flex-col gap-1.5">
							<span className="font-mono text-xs font-medium uppercase tracking-wider text-ink-faint">
								Email
							</span>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
								placeholder="you@example.com"
							/>
						</label>

						<label className="flex flex-col gap-1.5">
							<span className="font-mono text-xs font-medium uppercase tracking-wider text-ink-faint">
								Password
							</span>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSubmit();
								}}
								className="rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
								placeholder="••••••••"
							/>
						</label>

						{error && (
							<p className="rounded-lg bg-important-soft px-3 py-2 text-sm text-important">
								{error}
							</p>
						)}

						<button
							onClick={handleSubmit}
							disabled={submitting || !email || !password}
							className="mt-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_-2px_var(--color-accent)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_6px_28px_-2px_var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_20px_-2px_var(--color-accent)]"
						>
							{submitting
								? "Please wait…"
								: mode === "login"
									? "Sign in"
									: "Sign up"}
						</button>
					</div>
				</div>

				<p className="mt-5 text-center text-sm text-ink-soft">
					{mode === "login"
						? "Don't have an account?"
						: "Already have an account?"}{" "}
					<button
						onClick={() => {
							setMode(mode === "login" ? "signup" : "login");
							setError(null);
						}}
						className="font-medium text-accent transition-colors hover:text-accent-hover"
					>
						{mode === "login" ? "Sign up" : "Sign in"}
					</button>
				</p>
			</div>
		</div>
	);
}
