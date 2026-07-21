/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./landing.css";

export default function LandingPage() {
	const router = useRouter();

	useEffect(() => {
		// Collect timers/observers to clean up on unmount
		const intervals: number[] = [];
		const observers: IntersectionObserver[] = [];
		const _setInterval = (fn: () => void, ms: number): number => {
			const id = setInterval(fn, ms) as unknown as number;
			intervals.push(id);
			return id;
		};

		const _IO = IntersectionObserver;
		const makeIO = (
			cb: IntersectionObserverCallback,
			opts?: IntersectionObserverInit,
		) => {
			const o = new _IO(cb, opts);
			observers.push(o);
			return o;
		};
		// Helpers for TS null-safety on DOM lookups (elements exist at runtime).
		const $id = (id: string): HTMLElement | null => document.getElementById(id);
		const $q = (sel: string): Element | null => document.querySelector(sel);
		let mounted = true;

		// ---- Sifting demo animation ----
		const incoming = [
			{
				from: "LinkedIn Jobs",
				sub: "Software Developer, Co-op at Clio",
				cat: "imp",
			},
			{ from: "Prime Video", sub: "You subscribed to TSN", cat: "rou" },
			{ from: "OpenTable", sub: "Top tables near you downtown", cat: "junk" },
			{
				from: "Gurpreet (Manager)",
				sub: "Re: your shift swap request",
				cat: "imp",
			},
			{ from: "DoorDash", sub: "25% off your next order", cat: "junk" },
			{
				from: "BambooHR",
				sub: "Your time-off request has a response",
				cat: "rou",
			},
			{
				from: "Recruiter — Later",
				sub: "AI Automation Engineer Co-op",
				cat: "imp",
			},
			{ from: "Glassdoor", sub: "New jobs in Salmon Arm, BC", cat: "junk" },
			{ from: "Amazon", sub: "Your package was delivered", cat: "rou" },
			{ from: "FOX One", sub: "Start your free trial now", cat: "junk" },
		];

		const catMap: Record<string, { list: string; count: string; n: number }> = {
			imp: { list: "bImp", count: "cImp", n: 0 },
			rou: { list: "bRou", count: "cRou", n: 0 },
			junk: { list: "bJunk", count: "cJunk", n: 0 },
		};

		function runDemo() {
			const rawList = $id("rawList");
			if (!mounted || !rawList) return;
			rawList.innerHTML = "";
			Object.values(catMap).forEach((c) => {
				c.n = 0;
				const listEl = $id(c.list);
				const countEl = $id(c.count);
				if (listEl) listEl.innerHTML = "";
				if (countEl) countEl.textContent = "0";
			});

			incoming.forEach((mail, i) => {
				// add raw email on the left
				setTimeout(() => {
					if (!mounted || !rawList) return;
					const el = document.createElement("div");
					el.className = "raw-email";
					el.innerHTML = `<div class="re-from">${mail.from}</div><div class="re-sub">${mail.sub}</div>`;
					rawList.appendChild(el);
					// keep only last ~6 visible
					while (rawList.children.length > 6 && rawList.firstChild) {
						rawList.removeChild(rawList.firstChild);
					}
				}, i * 420);

				// sort into bucket shortly after
				setTimeout(
					() => {
						if (!mounted) return;
						const c = catMap[mail.cat];
						c.n++;
						const countEl = $id(c.count);
						const bucket = $id(c.list);
						if (countEl) countEl.textContent = String(c.n);
						if (bucket && bucket.children.length < 3) {
							const s = document.createElement("div");
							s.className = "sorted-email";
							s.innerHTML = `<span class="tick">→</span> ${mail.sub}`;
							bucket.appendChild(s);
						}
					},
					i * 420 + 260,
				);
			});
		}

		// ---- Scroll reveal ----
		const io = makeIO(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) {
						e.target.classList.add("in");
						io.unobserve(e.target);
					}
				});
			},
			{ threshold: 0.15 },
		);
		document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

		// run demo when it scrolls into view, loop it
		const demoEl = $q(".demo");
		let started = false;
		const demoIO = makeIO(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting && !started) {
						started = true;
						runDemo();
						_setInterval(runDemo, incoming.length * 420 + 2600);
					}
				});
			},
			{ threshold: 0.3 },
		);
		if (demoEl) demoIO.observe(demoEl);

		// ---- Feature mockup animations ----
		// A: AI badge + typed reason
		function runMockupA() {
			const badge = $id("mkBadge");
			const reason = $id("mkReason");
			if (!mounted || !badge || !reason) return;
			badge.classList.remove("show");
			reason.innerHTML = "";
			void badge.offsetWidth; // reflow to restart animation
			setTimeout(() => badge.classList.add("show"), 400);
			const text = "Interview-adjacent — a co-op role matching your search.";
			setTimeout(() => {
				let i = 0;
				const type = _setInterval(() => {
					if (!mounted) {
						clearInterval(type);
						return;
					}
					reason.innerHTML = text.slice(0, i) + '<span class="cursor"></span>';
					i++;
					if (i > text.length) {
						clearInterval(type);
						reason.innerHTML = text;
					}
				}, 26);
			}, 900);
		}

		// B: digest rows assemble
		const digestRows = [
			{
				dot: "var(--important)",
				text: "Recruiter proposing Thursday call",
				tag: "Important",
			},
			{
				dot: "var(--important)",
				text: "Manager approved your shift swap",
				tag: "Important",
			},
			{
				dot: "var(--routine)",
				text: "Package delivered · Amazon",
				tag: "Routine",
			},
			{
				dot: "var(--routine)",
				text: "Time-off request response",
				tag: "Routine",
			},
			{ dot: "var(--junk)", text: "25% off · DoorDash", tag: "Junk" },
		];
		function runMockupB() {
			const wrap = $id("mkDigest");
			if (!mounted || !wrap) return;
			wrap.innerHTML = "";
			digestRows.forEach((r, i) => {
				const row = document.createElement("div");
				row.className = "mk-digest-row";
				row.innerHTML = `<span class="md-dot" style="background:${r.dot}"></span><span class="md-text">${r.text}</span><span class="md-tag">${r.tag}</span>`;
				wrap.appendChild(row);
				setTimeout(() => row.classList.add("show"), 150 + i * 180);
			});
		}

		// C: heatmap cells fill in, then the trend line draws
		function runMockupC() {
			const heat = $id("mkHeat");
			const trend = $id("mkTrend");
			if (!mounted || !heat || !trend) return;
			heat.innerHTML = "";
			trend.classList.remove("draw");
			void trend.offsetWidth; // restart the line animation
			const intensities = [
				0.1, 0.3, 0.2, 0.5, 0.8, 0.3, 0.1, 0.2, 0.6, 0.4, 0.9, 0.5, 0.2, 0.1,
				0.4, 0.3, 0.7, 0.5, 1.0, 0.6, 0.2, 0.3, 0.5, 0.4, 0.7, 0.6, 0.4, 0.2,
			];
			intensities.forEach((v, i) => {
				const cell = document.createElement("div");
				cell.className = "mk-cell";
				const c = `rgba(133,160,255,${v * 0.85})`; // cool blue intensity
				cell.style.background = v > 0.15 ? c : "var(--bg-card)";
				cell.style.borderColor =
					v > 0.5 ? "rgba(133,160,255,0.4)" : "var(--border-soft)";
				heat.appendChild(cell);
				setTimeout(() => cell.classList.add("show"), i * 22);
			});
			// draw the trend line once the heatmap has mostly filled
			setTimeout(
				() => trend.classList.add("draw"),
				intensities.length * 22 + 200,
			);
		}

		// trigger each mockup when its row scrolls in, then loop
		const mockupRunners: Record<string, () => void> = {
			A: runMockupA,
			B: runMockupB,
			C: runMockupC,
		};
		const mockupIntervals: Record<string, number> = {
			A: 4200,
			B: 4200,
			C: 5200,
		};
		const mockupLoops: Record<string, number | null> = {};
		document.querySelectorAll("[data-mockup]").forEach((el) => {
			const key = el.getAttribute("data-mockup") as string;
			const io = makeIO(
				(entries) => {
					entries.forEach((e) => {
						if (e.isIntersecting) {
							if (!mockupLoops[key]) {
								mockupRunners[key]();
								mockupLoops[key] = _setInterval(
									mockupRunners[key],
									mockupIntervals[key],
								);
							}
						} else {
							if (mockupLoops[key]) clearInterval(mockupLoops[key] as number);
							mockupLoops[key] = null;
						}
					});
				},
				{ threshold: 0.4 },
			);
			io.observe(el);
		});

		return () => {
			mounted = false;
			intervals.forEach(clearInterval);
			observers.forEach((o) => o.disconnect());
		};
	}, []);

	const go = (path: string) => (e: React.MouseEvent) => {
		e.preventDefault();
		router.push(path);
	};

	return (
		<div className="sift-landing">
			{/* NAV */}
			<nav>
				<div className="nav-inner">
					<div className="logo">
						<span className="logo-mark">
							<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
								<path
									d="M5 6h18M7 11h14M10 16h8M13 21h2"
									stroke="url(#g)"
									strokeWidth="2.2"
									strokeLinecap="round"
								/>
								<defs>
									<linearGradient id="g" x1="5" y1="6" x2="23" y2="21">
										<stop stopColor="#85a0ff" />
										<stop offset="1" stopColor="#e08bb4" />
									</linearGradient>
								</defs>
							</svg>
						</span>
						Sift
					</div>
					<div className="nav-links">
						<a href="#how" className="link">
							How it works
						</a>
						<a href="#features" className="link">
							Features
						</a>
						<a href="#privacy" className="link">
							Privacy
						</a>
						<a href="/login" onClick={go("/login")} className="btn btn-ghost">
							Log in
						</a>
						<a href="/login" onClick={go("/login")} className="btn btn-primary">
							Create account
						</a>
					</div>
				</div>
			</nav>

			{/* HERO */}
			<header className="hero wrap">
				<div className="eyebrow">
					<span className="dot"></span> AI-powered inbox triage
				</div>
				<h1>
					See what matters.
					<br />
					<span className="grad">Sift the rest.</span>
				</h1>
				<p className="hero-sub">
					Your inbox is noise. Sift reads every email, sorts the signal from the
					clutter, and hands you a calm daily digest of what actually needs you.
				</p>
				<div className="hero-cta">
					<a
						href="/login"
						onClick={go("/login")}
						className="btn btn-primary btn-lg"
					>
						Create your account
					</a>
					<a href="#how" className="btn btn-ghost btn-lg">
						See how it works
					</a>
				</div>
				<p className="hero-note">
					Connects to Gmail · You're in control · Your email content is never
					stored
				</p>

				{/* SIGNATURE: the sifting demo */}
				<div className="demo reveal">
					<div className="demo-chrome">
						<span className="demo-dot" style={{ background: "#f470a5" }}></span>
						<span className="demo-dot" style={{ background: "#efb945" }}></span>
						<span className="demo-dot" style={{ background: "#5bcf8d" }}></span>
						<span className="demo-title">sift · this morning</span>
					</div>
					<div className="demo-stage">
						<div className="stream-in">
							<div className="stream-label">Incoming — 31 emails</div>
							<div id="rawList"></div>
						</div>
						<div className="buckets">
							<div className="bucket">
								<div className="bucket-head">
									<span className="bucket-badge badge-important">
										Important
									</span>
									<span className="bucket-count" id="cImp">
										0
									</span>
								</div>
								<div id="bImp"></div>
							</div>
							<div className="bucket">
								<div className="bucket-head">
									<span className="bucket-badge badge-routine">Routine</span>
									<span className="bucket-count" id="cRou">
										0
									</span>
								</div>
								<div id="bRou"></div>
							</div>
							<div className="bucket">
								<div className="bucket-head">
									<span className="bucket-badge badge-junk">Junk</span>
									<span className="bucket-count" id="cJunk">
										0
									</span>
								</div>
								<div id="bJunk"></div>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* TRUST STRIP */}
			<div className="strip wrap">
				<p>
					Built for people who live in their inbox — and want their day back
				</p>
			</div>

			{/* PROBLEM */}
			<section className="problem wrap">
				<div className="sec-head reveal">
					<div className="sec-eyebrow">The problem</div>
					<h2>Email hides what matters in a pile of what doesn't.</h2>
				</div>
				<p className="big reveal">
					<span className="hi">
						A handful of emails a day genuinely need you.
					</span>
					<span className="muted">
						{" "}
						The rest is newsletters, receipts, alerts, and noise you scroll past
						— but still have to scroll past. So the message that mattered gets
						buried, and you find it three days too late.
					</span>
				</p>
			</section>

			{/* HOW IT WORKS */}
			<section id="how" className="wrap">
				<div className="sec-head reveal">
					<div className="sec-eyebrow">How it works</div>
					<h2>Three steps to a quieter inbox.</h2>
					<p className="sec-lead">
						No new app to live in. No rules to configure. Sift works in the
						background and hands you the result.
					</p>
				</div>
				<div className="steps">
					<div className="step reveal">
						<span className="step-num">01</span>
						<h3>Connect your Gmail</h3>
						<p>
							One secure click through Google. Sift connects to your inbox — and
							only ever acts when you ask it to. Nothing is sent, deleted, or
							changed on its own.
						</p>
					</div>
					<div className="step reveal">
						<span className="step-num">02</span>
						<h3>Sift reads and sorts</h3>
						<p>
							Every new email is read by AI and sorted into Important, Routine,
							or Junk — each with a one-line reason you can check.
						</p>
					</div>
					<div className="step reveal">
						<span className="step-num">03</span>
						<h3>Get your digest</h3>
						<p>
							Open Sift to a clean summary of what mattered — not another inbox
							to clear. See patterns over time in your dashboard.
						</p>
					</div>
				</div>
			</section>

			{/* FEATURES */}
			<section id="features" className="wrap">
				<div className="sec-head reveal">
					<div className="sec-eyebrow">What you get</div>
					<h2>Less inbox. More signal.</h2>
					<p className="sec-lead">
						Everything Sift does is in service of one thing: giving you back the
						time email steals.
					</p>
				</div>
				{/* Feature row 1: AI triage (animated badge-tagging) */}
				<div className="feature-row reveal">
					<div className="feature-copy">
						<div className="feature-tag">01 — The triage</div>
						<h3>AI that reads like you would</h3>
						<p>
							Sift judges each email the way you'd triage it yourself — a co-op
							offer is important, a sale flyer isn't — and tells you the reason
							it decided, so you're never guessing why something landed where it
							did.
						</p>
					</div>
					<div className="feature-visual" data-mockup="A">
						<div className="mk-email">
							<div className="mk-from">LinkedIn Jobs</div>
							<div className="mk-sub">Software Developer, Co-op at Clio</div>
							<div className="mk-verdict">
								<span className="mk-badge badge-important" id="mkBadge">
									Important
								</span>
							</div>
							<div className="mk-reason" id="mkReason"></div>
						</div>
					</div>
				</div>

				{/* Feature row 2: the digest (assembling) */}
				<div className="feature-row flip reveal">
					<div className="feature-copy">
						<div className="feature-tag">02 — The digest</div>
						<h3>A digest, not another firehose</h3>
						<p>
							Instead of 200 unread, you get a short read: what's important,
							what's routine, what's noise — grouped and summarized so you skim
							your morning in seconds, not an hour.
						</p>
					</div>
					<div className="feature-visual" data-mockup="B">
						<div className="mk-digest" id="mkDigest"></div>
					</div>
				</div>

				{/* Feature row 3: patterns (heatmap draws in) */}
				<div className="feature-row reveal">
					<div className="feature-copy">
						<div className="feature-tag">03 — The patterns</div>
						<h3>See how your inbox really flows</h3>
						<p>
							A calendar heatmap and trend charts show which days spike, how
							much is actually important, and where the noise comes from — so
							you learn the shape of your own inbox over time.
						</p>
					</div>
					<div className="feature-visual" data-mockup="C">
						<div className="mk-patterns">
							<div>
								<div className="mk-trend-label">
									Inbox activity · last 4 weeks
								</div>
								<div className="mk-weekdays">
									<span>S</span>
									<span>M</span>
									<span>T</span>
									<span>W</span>
									<span>T</span>
									<span>F</span>
									<span>S</span>
								</div>
								<div className="mk-heat" id="mkHeat"></div>
							</div>
							<div className="mk-trend-wrap">
								<div className="mk-trend-label">Important emails · trend</div>
								<svg className="mk-trend" id="mkTrend" viewBox="0 0 320 72">
									<defs>
										<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0" stopColor="#85a0ff" stopOpacity="0.32" />
											<stop offset="1" stopColor="#85a0ff" stopOpacity="0" />
										</linearGradient>
									</defs>
									<path
										className="area"
										d="M0,54 L53,40 L107,48 L160,24 L213,32 L267,12 L320,20 L320,72 L0,72 Z"
									/>
									<path
										className="line"
										d="M0,54 L53,40 L107,48 L160,24 L213,32 L267,12 L320,20"
									/>
									<circle className="pt" cx="267" cy="12" r="3.5" />
									<circle className="pt" cx="320" cy="20" r="3.5" />
								</svg>
							</div>
						</div>
					</div>
				</div>

				{/* Two clean supporting cards (security + multi-user) */}
				<div
					className="feature-row reveal"
					style={{
						gridTemplateColumns: "1fr 1fr",
						gap: "20px",
						marginTop: "8px",
					}}
				>
					<div
						className="feature-visual"
						style={{
							height: "auto",
							padding: "30px",
							justifyContent: "flex-start",
						}}
					>
						<div
							className="feature-icon"
							style={{
								width: "44px",
								height: "44px",
								borderRadius: "11px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: "18px",
								background: "rgba(124,120,255,0.12)",
								border: "1px solid var(--border)",
							}}
						>
							<svg
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="#9d9aff"
								strokeWidth="2"
								strokeLinecap="round"
							>
								<rect x="5" y="11" width="14" height="10" rx="2" />
								<path d="M8 11V7a4 4 0 0 1 8 0v4" />
							</svg>
						</div>
						<h3
							style={{
								fontFamily: "var(--font-display)",
								fontWeight: "600",
								fontSize: "21px",
								letterSpacing: "-0.01em",
								marginBottom: "10px",
							}}
						>
							Secure by connection
						</h3>
						<p
							style={{
								color: "var(--ink-soft)",
								fontSize: "15px",
								lineHeight: "1.6",
							}}
						>
							Your Gmail connects through Google's own OAuth. Encrypted
							credentials, actions only ever taken at your request, and you can
							disconnect in one click, any time.
						</p>
					</div>
					<div
						className="feature-visual"
						style={{
							height: "auto",
							padding: "30px",
							justifyContent: "flex-start",
						}}
					>
						<div
							className="feature-icon"
							style={{
								width: "44px",
								height: "44px",
								borderRadius: "11px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: "18px",
								background: "rgba(244,112,165,0.12)",
								border: "1px solid var(--border)",
							}}
						>
							<svg
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="#e08bb4"
								strokeWidth="2"
								strokeLinecap="round"
							>
								<path d="M20 6 9 17l-5-5" />
							</svg>
						</div>
						<h3
							style={{
								fontFamily: "var(--font-display)",
								fontWeight: "600",
								fontSize: "21px",
								letterSpacing: "-0.01em",
								marginBottom: "10px",
							}}
						>
							Yours only — truly multi-user
						</h3>
						<p
							style={{
								color: "var(--ink-soft)",
								fontSize: "15px",
								lineHeight: "1.6",
							}}
						>
							Every account is fully isolated. Your inbox, your digest, your
							patterns — tied to your Google account and no one else's. No data
							ever crosses between users.
						</p>
					</div>
				</div>
			</section>

			{/* PRIVACY */}
			<section id="privacy" className="privacy">
				<div className="wrap">
					<div className="sec-head reveal">
						<div className="sec-eyebrow">Privacy by design</div>
						<h2>Sift never keeps your email.</h2>
						<p className="sec-lead">
							This isn't a promise bolted on afterward — it's how Sift is built.
							The one thing most email tools quietly hoard, Sift throws away.
						</p>
					</div>
					<div className="privacy-card">
						<div className="privacy-points reveal">
							<div className="pp">
								<span className="pp-check">✓</span>
								<span className="pp-text">
									<strong>Content is never stored</strong>
									<span>
										Sift reads an email to categorize it, then keeps only the
										verdict — never the body. Gmail stays the single source of
										truth.
									</span>
								</span>
							</div>
							<div className="pp">
								<span className="pp-check">✓</span>
								<span className="pp-text">
									<strong>Nothing happens without you</strong>
									<span>
										Sift never sends, deletes, or changes anything on its own.
										Any action on your mail happens only when you ask for it —
										never automatically, never in the background.
									</span>
								</span>
							</div>
							<div className="pp">
								<span className="pp-check">✓</span>
								<span className="pp-text">
									<strong>Credentials encrypted at rest</strong>
									<span>
										Your Google tokens are encrypted before they're stored. A
										leak of the database exposes nothing usable.
									</span>
								</span>
							</div>
							<div className="pp">
								<span className="pp-check">✓</span>
								<span className="pp-text">
									<strong>Disconnect anytime</strong>
									<span>
										One click revokes Sift's access completely. No lingering
										permissions, no dark patterns.
									</span>
								</span>
							</div>
						</div>
						<div className="code-window reveal">
							<div className="code-head">
								<span
									className="demo-dot"
									style={{
										background: "#f470a5",
										width: "10px",
										height: "10px",
									}}
								></span>
								<span
									className="demo-dot"
									style={{
										background: "#efb945",
										width: "10px",
										height: "10px",
									}}
								></span>
								<span
									className="demo-dot"
									style={{
										background: "#5bcf8d",
										width: "10px",
										height: "10px",
									}}
								></span>
								<span className="demo-title">what sift stores</span>
							</div>
							<div className="code-body">
								<span className="c-com">
									# From each email, Sift keeps only:
								</span>
								<br />
								{"{"}
								<br />
								  <span className="c-key">"category"</span>:{" "}
								<span className="c-str">"IMPORTANT"</span>,<br />
								  <span className="c-key">"reason"</span>:{" "}
								<span className="c-str">
									"Interview invite, time-sensitive"
								</span>
								,<br />
								  <span className="c-key">"summary"</span>:{" "}
								<span className="c-str">"Recruiter proposing Thursday"</span>
								<br />
								{"}"}
								<br />
								<br />
								<span className="c-com"># The email body itself?</span>
								<br />
								<span className="c-mut">
									→ never leaves Gmail. never stored.
								</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* FINAL CTA */}
			<section className="final wrap">
				<div className="final-card reveal">
					<h2>Give your inbox back its quiet.</h2>
					<p>
						Connect your Gmail and let Sift handle the noise. Your morning
						digest is waiting.
					</p>
					<a
						href="/login"
						onClick={go("/login")}
						className="btn btn-primary btn-lg"
					>
						Create your account
					</a>
				</div>
			</section>

			{/* FOOTER */}
			<footer>
				<div className="wrap foot-inner">
					<div className="logo" style={{ fontSize: "19px" }}>
						<span className="logo-mark">
							<svg width="24" height="24" viewBox="0 0 28 28" fill="none">
								<path
									d="M5 6h18M7 11h14M10 16h8M13 21h2"
									stroke="url(#g2)"
									strokeWidth="2.2"
									strokeLinecap="round"
								/>
								<defs>
									<linearGradient id="g2" x1="5" y1="6" x2="23" y2="21">
										<stop stopColor="#85a0ff" />
										<stop offset="1" stopColor="#e08bb4" />
									</linearGradient>
								</defs>
							</svg>
						</span>
						Sift
					</div>
					<div className="foot-links">
						<a href="#how">How it works</a>
						<a href="#features">Features</a>
						<a href="#privacy">Privacy</a>
						<a href="/login" onClick={go("/login")}>
							Log in
						</a>
					</div>
					<div className="foot-note">Built by Marcos Blanco</div>
				</div>
			</footer>
		</div>
	);
}
