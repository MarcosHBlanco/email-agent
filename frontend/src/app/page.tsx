/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
	AnimatePresence,
	motion,
	useInView,
	useReducedMotion,
	type Transition,
} from "motion/react";
import "./landing.css";
import {
	fadeInUp,
	revealTransition,
	revealUp,
	scaleIn,
	springTransition,
	staggerContainerSlow,
	staggerItem,
	transition,
} from "@/lib/motion";

// ---- Scroll-reveal helper ----
// Every section that used to carry a `.reveal` class + IntersectionObserver
// (in the old vanilla-JS version of this page) now gets these props instead.
// `whileInView` + `viewport={{ once: true }}` is motion/react's built-in
// replacement for "observe this element, animate it in, then stop watching" —
// which is exactly what the manual IntersectionObserver was doing by hand.
// See the chat explanation for the full walkthrough of why this replaces it.
function useReveal() {
	const prefersReducedMotion = useReducedMotion();
	return (delay = 0) => ({
		variants: prefersReducedMotion
			? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
			: revealUp,
		initial: "hidden" as const,
		whileInView: "visible" as const,
		viewport: { once: true, amount: 0.2 },
		transition: prefersReducedMotion
			? { duration: 0 }
			: { ...revealTransition, delay },
	});
}

export default function LandingPage() {
	const router = useRouter();
	const reveal = useReveal();

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
					clutter, and hands you a calm digest of what actually needs you —
					ready to read and reply to, three times a day.
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
				<SiftDemo reveal={reveal} />
			</header>

			{/* TRUST STRIP */}
			<div className="strip wrap">
				<p>
					Built for people who live in their inbox — and want their day back
				</p>
			</div>

			{/* PROBLEM */}
			<section className="problem wrap">
				<motion.div className="sec-head" {...reveal()}>
					<div className="sec-eyebrow">The problem</div>
					<h2>Email hides what matters in a pile of what doesn't.</h2>
				</motion.div>
				<motion.p className="big" {...reveal()}>
					<span className="hi">
						A handful of emails a day genuinely need you.
					</span>
					<span className="muted">
						{" "}
						The rest is newsletters, receipts, alerts, and noise you scroll past
						— but still have to scroll past. So the message that mattered gets
						buried, and you find it three days too late.
					</span>
				</motion.p>
			</section>

			{/* HOW IT WORKS */}
			<section id="how" className="wrap">
				<motion.div className="sec-head" {...reveal()}>
					<div className="sec-eyebrow">How it works</div>
					<h2>Three steps to a quieter inbox.</h2>
					<p className="sec-lead">
						No rules to configure, nothing to check. Sift runs three times a day
						on its own — your digest is ready before you think to look.
					</p>
				</motion.div>
				<div className="steps">
					<motion.div className="step" {...reveal(0)}>
						<span className="step-num">01</span>
						<h3>Connect your Gmail</h3>
						<p>
							One secure click through Google. Sift connects to your inbox — and
							only ever acts when you ask it to. Nothing is sent, deleted, or
							changed on its own.
						</p>
					</motion.div>
					<motion.div className="step" {...reveal(0.08)}>
						<span className="step-num">02</span>
						<h3>Sift reads and sorts</h3>
						<p>
							Every new email is read by AI and sorted into Important, Routine,
							or Junk — each with a one-line reason you can check.
						</p>
					</motion.div>
					<motion.div className="step" {...reveal(0.16)}>
						<span className="step-num">03</span>
						<h3>Read it. Answer it. Done.</h3>
						<p>
							Open Sift to what actually mattered — then read the full email,
							reply, or bin it without leaving. The five that need you get
							handled in the time it took to scroll past them.
						</p>
					</motion.div>
				</div>
			</section>

			{/* FEATURES */}
			<section id="features" className="wrap">
				<motion.div className="sec-head" {...reveal()}>
					<div className="sec-eyebrow">What you get</div>
					<h2>Less inbox. More signal.</h2>
					<p className="sec-lead">
						Everything Sift does is in service of one thing: giving you back the
						time email steals.
					</p>
				</motion.div>
				{/* Feature row 1: AI triage (animated badge-tagging) */}
				<motion.div className="feature-row" {...reveal()}>
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
					<MockupA />
				</motion.div>

				{/* Feature row 2: the digest (assembling) */}
				<motion.div className="feature-row flip" {...reveal()}>
					<div className="feature-copy">
						<div className="feature-tag">02 — The digest</div>
						<h3>A digest, not another firehose</h3>
						<p>
							Instead of 200 unread, you get a short read: what's important,
							what's routine, what's noise — grouped and summarized so you skim
							your morning in seconds, not an hour.
						</p>
					</div>
					<MockupB />
				</motion.div>

				{/* Feature row 3: patterns (heatmap draws in) */}
				<motion.div className="feature-row" {...reveal()}>
					<div className="feature-copy">
						<div className="feature-tag">03 — The patterns</div>
						<h3>See how your inbox really flows</h3>
						<p>
							A calendar heatmap and trend charts show which days spike, how
							much is actually important, and where the noise comes from — so
							you learn the shape of your own inbox over time.
						</p>
					</div>
					<MockupC />
				</motion.div>

				{/* Feature row 4: actions */}
				<motion.div className="feature-row flip" {...reveal()}>
					<div className="feature-copy">
						<div className="feature-tag">04 — The actions</div>
						<h3>Handle it without leaving</h3>
						<p>
							Reading a digest is only half the job. Open any email in full,
							reply or reply-all, or bin it — right from Sift. The handful that
							need you get answered in the time it used to take just to find
							them.
						</p>
					</div>
					<div className="feature-visual">
						<div className="mk-actions">
							<div className="mk-email">
								<div className="mk-from">Sarah Chen · Product</div>
								<div className="mk-sub">Re: Q3 launch timeline</div>
								<div className="mk-actions-body">
									Confirming we&apos;re still on for the 15th — can you review
									the deck before then?
								</div>
							</div>
							<div className="mk-action-bar">
								<span className="mk-action-btn mk-action-primary">Reply</span>
								<span className="mk-action-btn">Reply all</span>
								<span className="mk-action-btn">Delete</span>
								<span className="mk-action-btn">Open in Gmail</span>
							</div>
						</div>
					</div>
				</motion.div>

				{/* Two clean supporting cards (security + multi-user) */}
				<motion.div
					className="feature-row"
					{...reveal()}
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
				</motion.div>
			</section>

			{/* PRIVACY */}
			<section id="privacy" className="privacy">
				<div className="wrap">
					<motion.div className="sec-head" {...reveal()}>
						<div className="sec-eyebrow">Privacy by design</div>
						<h2>Sift never keeps your email.</h2>
						<p className="sec-lead">
							This isn't a promise bolted on afterward — it's how Sift is built.
							The one thing most email tools quietly hoard, Sift throws away.
						</p>
					</motion.div>
					<div className="privacy-card">
						<motion.div className="privacy-points" {...reveal()}>
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
						</motion.div>
						<motion.div className="code-window" {...reveal(0.1)}>
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
						</motion.div>
					</div>
				</div>
			</section>

			{/* FINAL CTA */}
			<section className="final wrap">
				<motion.div className="final-card" {...reveal()}>
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
				</motion.div>
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

// =====================================================================
// SIGNATURE DEMO — the "sifting" animation in the hero.
//
// This is the one animation in the old version that couldn't just become
// `whileInView` on a single element, because it isn't one state change —
// it's a *sequence*: emails arrive one at a time, then a beat later each
// one lands in a bucket. That requires real state that changes over time,
// which means real React state + a timer, not just a declarative variant.
// See the chat explanation for why this one is architecturally different
// from MockupB/MockupC below.
// =====================================================================

// The single source of truth for "what categories exist." MailCat is
// DERIVED from this array (below), rather than declared separately — so
// there is exactly one place to edit to add/remove a category, and nothing
// can silently drift out of sync with it (see the chat explanation for the
// bug this used to allow: a hand-typed literal array used only for
// rendering, with no type-level connection back to MailCat, could omit a
// category and TypeScript would never notice).
const MAIL_CATEGORIES = ["imp", "rou", "junk"] as const;
// `(typeof MAIL_CATEGORIES)[number]` reads as "the type of one element of
// this array" — TypeScript computes "imp" | "rou" | "junk" from the array's
// actual contents. Add a category to the array above and this type gains it
// automatically, with zero extra edits.
type MailCat = (typeof MAIL_CATEGORIES)[number];
interface IncomingMail {
	from: string;
	sub: string;
	cat: MailCat;
}

const INCOMING: IncomingMail[] = [
	{ from: "LinkedIn Jobs", sub: "Software Developer, Co-op at Clio", cat: "imp" },
	{ from: "Prime Video", sub: "You subscribed to TSN", cat: "rou" },
	{ from: "OpenTable", sub: "Top tables near you downtown", cat: "junk" },
	{ from: "Gurpreet (Manager)", sub: "Re: your shift swap request", cat: "imp" },
	{ from: "DoorDash", sub: "25% off your next order", cat: "junk" },
	{ from: "BambooHR", sub: "Your time-off request has a response", cat: "rou" },
	{ from: "Recruiter — Later", sub: "AI Automation Engineer Co-op", cat: "imp" },
	{ from: "Glassdoor", sub: "New jobs in Salmon Arm, BC", cat: "junk" },
	{ from: "Amazon", sub: "Your package was delivered", cat: "rou" },
	{ from: "FOX One", sub: "Start your free trial now", cat: "junk" },
];

const BUCKET_LABEL: Record<MailCat, string> = {
	imp: "Important",
	rou: "Routine",
	junk: "Junk",
};
const BUCKET_BADGE_CLASS: Record<MailCat, string> = {
	imp: "badge-important",
	rou: "badge-routine",
	junk: "badge-junk",
};

// A one-off variant (not in lib/motion.ts) — the "tick" arriving from the
// left is a small flourish specific to this one demo, not a shape reused
// anywhere else in the app, so it doesn't earn a place in the shared file.
const slideInFromLeft = {
	hidden: { opacity: 0, x: -10 },
	visible: { opacity: 1, x: 0 },
};

function SiftDemo({ reveal }: { reveal: (delay?: number) => object }) {
	// A plain ref, used only by our own useInView call below — separate from
	// (and compatible with) the `whileInView` prop already spread onto this
	// same element via {...reveal()}. One watches "should this fade in", the
	// other watches "should the multi-step timeline start" — two different
	// questions about the same element, so two independent observers.
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, amount: 0.3 });
	const prefersReducedMotion = useReducedMotion();

	const [rawItems, setRawItems] = useState<(IncomingMail & { key: number })[]>(
		[],
	);
	const [counts, setCounts] = useState<Record<MailCat, number>>({
		imp: 0,
		rou: 0,
		junk: 0,
	});
	const [bucketRows, setBucketRows] = useState<Record<MailCat, string[]>>({
		imp: [],
		rou: [],
		junk: [],
	});

	useEffect(() => {
		if (!inView) return;

		// Reduced motion: jump straight to the finished state instead of
		// staging a ~4.6s sequence someone asked their OS not to show them.
		// This is a genuine one-shot sync (triggered once when `inView` flips
		// true), not derivable during render — same pattern/rationale as the
		// `mounted` flag in Header.tsx.
		if (prefersReducedMotion) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setRawItems(INCOMING.slice(-6).map((mail, i) => ({ ...mail, key: i })));
			const finalCounts: Record<MailCat, number> = { imp: 0, rou: 0, junk: 0 };
			const finalRows: Record<MailCat, string[]> = { imp: [], rou: [], junk: [] };
			INCOMING.forEach((mail) => {
				finalCounts[mail.cat] += 1;
				if (finalRows[mail.cat].length < 3) finalRows[mail.cat].push(mail.sub);
			});
			setCounts(finalCounts);
			setBucketRows(finalRows);
			return;
		}

		const timers: ReturnType<typeof setTimeout>[] = [];
		INCOMING.forEach((mail, i) => {
			// Each email appears on the left first...
			timers.push(
				setTimeout(() => {
					setRawItems((prev) => [...prev, { ...mail, key: i }].slice(-6));
				}, i * 420),
			);
			// ...then lands in its bucket a beat later.
			timers.push(
				setTimeout(() => {
					setCounts((prev) => ({ ...prev, [mail.cat]: prev[mail.cat] + 1 }));
					setBucketRows((prev) => {
						if (prev[mail.cat].length >= 3) return prev; // only show 3 rows
						return { ...prev, [mail.cat]: [...prev[mail.cat], mail.sub] };
					});
				}, i * 420 + 260),
			);
		});

		// Cleanup: if the component unmounts mid-sequence (e.g. fast nav away),
		// cancel every pending timer so it can't call setState on a dead
		// component. This is the direct replacement for the old `mounted`
		// boolean flag pattern.
		return () => timers.forEach(clearTimeout);
	}, [inView, prefersReducedMotion]);

	return (
		<motion.div ref={ref} className="demo" {...reveal()}>
			<div className="demo-chrome">
				<span className="demo-dot" style={{ background: "#f470a5" }} />
				<span className="demo-dot" style={{ background: "#efb945" }} />
				<span className="demo-dot" style={{ background: "#5bcf8d" }} />
				<span className="demo-title">sift · this morning</span>
			</div>
			<div className="demo-stage">
				<div className="stream-in">
					<div className="stream-label">Incoming — 31 emails</div>
					<div id="rawList">
						<AnimatePresence initial={false}>
							{rawItems.map((item) => (
								<motion.div
									key={item.key}
									variants={fadeInUp}
									initial="hidden"
									animate="visible"
									exit={{ opacity: 0 }}
									transition={transition}
									className="raw-email"
								>
									<div className="re-from">{item.from}</div>
									<div className="re-sub">{item.sub}</div>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</div>
				<div className="buckets">
					{MAIL_CATEGORIES.map((cat) => (
						<div className="bucket" key={cat}>
							<div className="bucket-head">
								<span className={`bucket-badge ${BUCKET_BADGE_CLASS[cat]}`}>
									{BUCKET_LABEL[cat]}
								</span>
								<span className="bucket-count">{counts[cat]}</span>
							</div>
							<div className="bucket-list">
								<AnimatePresence initial={false}>
									{bucketRows[cat].map((text, i) => (
										<motion.div
											key={i}
											variants={slideInFromLeft}
											initial="hidden"
											animate="visible"
											transition={transition}
											className="sorted-email"
										>
											<span className="tick">→</span> {text}
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</div>
					))}
				</div>
			</div>
		</motion.div>
	);
}

// =====================================================================
// MOCKUP A — verdict badge pops in, then the reason types itself out.
// Also a real timeline (badge, then a delay, then a typewriter effect), so
// it needs the same imperative useInView + useEffect approach as SiftDemo.
// =====================================================================

const REASON_TEXT = "Interview-adjacent — a co-op role matching your search.";

function MockupA() {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, amount: 0.4 });
	const prefersReducedMotion = useReducedMotion();

	const [showBadge, setShowBadge] = useState(false);
	const [typedLength, setTypedLength] = useState(0);
	const [phase, setPhase] = useState<"idle" | "typing" | "done">("idle");

	useEffect(() => {
		if (!inView) return;

		if (prefersReducedMotion) {
			// One-shot sync triggered by `inView` flipping true — see the
			// matching comment in SiftDemo above.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setShowBadge(true);
			setTypedLength(REASON_TEXT.length);
			setPhase("done");
			return;
		}

		const badgeTimer = setTimeout(() => setShowBadge(true), 400);
		const startTypingTimer = setTimeout(() => {
			setPhase("typing");
			let i = 0;
			const typeInterval = setInterval(() => {
				i += 1;
				setTypedLength(i);
				if (i >= REASON_TEXT.length) {
					clearInterval(typeInterval);
					setPhase("done");
				}
			}, 26);
		}, 900);

		return () => {
			clearTimeout(badgeTimer);
			clearTimeout(startTypingTimer);
		};
	}, [inView, prefersReducedMotion]);

	return (
		<div ref={ref} className="feature-visual" data-mockup="A">
			<div className="mk-email">
				<div className="mk-from">LinkedIn Jobs</div>
				<div className="mk-sub">Software Developer, Co-op at Clio</div>
				<div className="mk-verdict">
					<AnimatePresence>
						{showBadge && (
							<motion.span
								variants={scaleIn}
								initial="hidden"
								animate="visible"
								transition={springTransition}
								className="mk-badge badge-important"
							>
								Important
							</motion.span>
						)}
					</AnimatePresence>
				</div>
				<div className="mk-reason">
					{REASON_TEXT.slice(0, typedLength)}
					{phase === "typing" && <span className="cursor" />}
				</div>
			</div>
		</div>
	);
}

// =====================================================================
// MOCKUP B — digest rows assembling.
// No real timeline here — every row just needs to fade/slide in, staggered.
// That's a pure "shape", so `whileInView` + staggerContainerSlow handles the
// whole thing declaratively: no ref, no useEffect, no timers.
// =====================================================================

const DIGEST_ROWS: { dot: string; text: string; tag: string }[] = [
	{ dot: "var(--important)", text: "Recruiter proposing Thursday call", tag: "Important" },
	{ dot: "var(--important)", text: "Manager approved your shift swap", tag: "Important" },
	{ dot: "var(--routine)", text: "Package delivered · Amazon", tag: "Routine" },
	{ dot: "var(--routine)", text: "Time-off request response", tag: "Routine" },
	{ dot: "var(--junk)", text: "25% off · DoorDash", tag: "Junk" },
];

function MockupB() {
	return (
		<div className="feature-visual" data-mockup="B">
			<motion.div
				className="mk-digest"
				variants={staggerContainerSlow}
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true, amount: 0.4 }}
			>
				{DIGEST_ROWS.map((row, i) => (
					<motion.div
						key={i}
						variants={staggerItem}
						transition={transition}
						className="mk-digest-row"
					>
						<span className="md-dot" style={{ background: row.dot }} />
						<span className="md-text">{row.text}</span>
						<span className="md-tag">{row.tag}</span>
					</motion.div>
				))}
			</motion.div>
		</div>
	);
}

// =====================================================================
// MOCKUP C — heatmap cells fill in, then the trend line draws.
// The cells are a pure "shape" (staggered scale-in), same idea as B. The
// trend line is the one place SVG has a superpower CSS doesn't: animating
// `pathLength` from 0 to 1 draws the stroke, no dasharray/dashoffset hacks.
// =====================================================================

const HEAT_INTENSITIES = [
	0.1, 0.3, 0.2, 0.5, 0.8, 0.3, 0.1, 0.2, 0.6, 0.4, 0.9, 0.5, 0.2, 0.1, 0.4,
	0.3, 0.7, 0.5, 1.0, 0.6, 0.2, 0.3, 0.5, 0.4, 0.7, 0.6, 0.4, 0.2,
];

function heatCellStyle(v: number): React.CSSProperties {
	// Toned down from 0.85 -> 0.6: the same heatmap, a notch calmer.
	const color = `rgba(133, 160, 255, ${v * 0.6})`;
	return {
		background: v > 0.15 ? color : "var(--bg-card)",
		borderColor: v > 0.5 ? "rgba(133, 160, 255, 0.32)" : "var(--border-soft)",
	};
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function MockupC() {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, amount: 0.4 });
	const prefersReducedMotion = useReducedMotion();

	// Zeroes out any transition's duration/delay under reduced motion, so the
	// finished state appears immediately instead of drawing in over ~2s.
	const t = (base: Transition): Transition =>
		prefersReducedMotion ? { duration: 0 } : base;

	return (
		<div ref={ref} className="feature-visual" data-mockup="C">
			<div className="mk-patterns">
				<div>
					<div className="mk-trend-label">Inbox activity · last 4 weeks</div>
					<div className="mk-weekdays">
						{WEEKDAY_LABELS.map((d, i) => (
							<span key={i}>{d}</span>
						))}
					</div>
					<motion.div
						className="mk-heat"
						variants={staggerContainerSlow}
						initial="hidden"
						animate={inView ? "visible" : "hidden"}
						transition={t({ staggerChildren: 0.022 })}
					>
						{HEAT_INTENSITIES.map((v, i) => (
							<motion.div
								key={i}
								variants={scaleIn}
								transition={t(transition)}
								className="mk-cell"
								style={heatCellStyle(v)}
							/>
						))}
					</motion.div>
				</div>
				<div className="mk-trend-wrap">
					<div className="mk-trend-label">Important emails · trend</div>
					<svg className="mk-trend" viewBox="0 0 320 72">
						<defs>
							<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stopColor="#85a0ff" stopOpacity="0.32" />
								<stop offset="1" stopColor="#85a0ff" stopOpacity="0" />
							</linearGradient>
						</defs>
						<motion.path
							className="area"
							d="M0,54 L53,40 L107,48 L160,24 L213,32 L267,12 L320,20 L320,72 L0,72 Z"
							initial={{ opacity: 0 }}
							animate={{ opacity: inView ? 1 : 0 }}
							transition={t({ duration: 0.8, delay: 0.9 })}
						/>
						<motion.path
							className="line"
							d="M0,54 L53,40 L107,48 L160,24 L213,32 L267,12 L320,20"
							initial={{ pathLength: 0 }}
							animate={{ pathLength: inView ? 1 : 0 }}
							transition={t({ duration: 1.6, ease: "easeInOut", delay: 0.2 })}
						/>
						<motion.circle
							className="pt"
							cx="267"
							cy="12"
							r="3.5"
							initial={{ opacity: 0 }}
							animate={{ opacity: inView ? 1 : 0 }}
							transition={t({ duration: 0.4, delay: 1.5 })}
						/>
						<motion.circle
							className="pt"
							cx="320"
							cy="20"
							r="3.5"
							initial={{ opacity: 0 }}
							animate={{ opacity: inView ? 1 : 0 }}
							transition={t({ duration: 0.4, delay: 1.5 })}
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}
