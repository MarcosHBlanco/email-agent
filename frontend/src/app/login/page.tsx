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
		<div className="flex min-h-screen items-center justify-center bg-canvas px-4">
			<div className="w-full max-w-sm">
				<div className="mb-6 text-center">
					<h1 className="text-xl font-semibold text-ink">Email Agent</h1>
					<p className="mt-1 text-sm text-ink-soft">
						{mode === "login" ? "Sign in to your account" : "Create an account"}
					</p>
				</div>

				<div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
					<div className="flex flex-col gap-3">
						<label className="flex flex-col gap-1">
							<span className="text-xs font-medium text-ink-soft">Email</span>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
								placeholder="you@example.com"
							/>
						</label>

						<label className="flex flex-col gap-1">
							<span className="text-xs font-medium text-ink-soft">
								Password
							</span>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSubmit();
								}}
								className="rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
								placeholder="••••••••"
							/>
						</label>

						{error && (
							<p className="rounded-md bg-important-soft px-3 py-2 text-sm text-important">
								{error}
							</p>
						)}

						<button
							onClick={handleSubmit}
							disabled={submitting || !email || !password}
							className="mt-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
						>
							{submitting
								? "Please wait…"
								: mode === "login"
									? "Sign in"
									: "Sign up"}
						</button>
					</div>
				</div>

				<p className="mt-4 text-center text-sm text-ink-soft">
					{mode === "login"
						? "Don't have an account?"
						: "Already have an account?"}{" "}
					<button
						onClick={() => {
							setMode(mode === "login" ? "signup" : "login");
							setError(null);
						}}
						className="font-medium text-accent hover:underline"
					>
						{mode === "login" ? "Sign up" : "Sign in"}
					</button>
				</p>
			</div>
		</div>
	);
}
