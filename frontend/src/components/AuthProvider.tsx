"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { API_BASE } from "@/lib/config";

interface User {
	id: number;
	email: string;
}

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<void>;
	signup: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	//On load, ask backend "who am I?" to check for existing session.
	useEffect(() => {
		let cancelled = false;
		async function checkAuth() {
			try {
				const res = await fetch(`${API_BASE}/auth/me`, {
					credentials: "include",
				});
				if (!cancelled) {
					if (res.ok) {
						const data = await res.json();
						setUser(data);
					} else {
						setUser(null);
					}
				}
			} catch {
				if (!cancelled) setUser(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		checkAuth();
		return () => {
			cancelled = true;
		};
	}, []);

	async function login(email: string, password: string): Promise<void> {
		const res = await fetch(`${API_BASE}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email, password }),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			const detail = data.detail;
			const message =
				detail?.message ?? // structured {code, message}
				(typeof detail === "string" ? detail : null) ?? // plain string
				"Signup failed";
			throw new Error(message);
		}
		const data = await res.json();
		setUser(data);
	}

	async function signup(email: string, password: string): Promise<void> {
		const res = await fetch(`${API_BASE}/auth/signup`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				email,
				password,
				// Capture the user's IANA timezone (e.g. "America/Vancouver") at
				// account creation. The server must own this: scheduled digest
				// runs fire with no browser present to ask.
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			}),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			const detail = data.detail;
			const message =
				detail?.message ?? // structured {code, message}
				(typeof detail === "string" ? detail : null) ?? // plain string
				"Signup failed";
			throw new Error(message);
		}
		const data = await res.json();
		setUser(data);
	}

	async function logout(): Promise<void> {
		await fetch(`${API_BASE}/auth/logout`, {
			method: "POST",
			credentials: "include",
		});
		setUser(null);
	}

	return (
		<AuthContext.Provider value={{ user, loading, login, signup, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (ctx === null) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return ctx;
}
