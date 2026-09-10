// Shared motion language — consistent timing and easing across the app.
// Fast and subtle, suited to a dense daily-use tool

import { Transition, Variants } from "motion/react";

// Base transition: quick, with a natural ease-out curve.
export const transition: Transition = {
	duration: 0.18,
	ease: [0.25, 0.1, 0.25, 1],
};

// A slightly springier transition for elements that should feel "alive"
// (panels appearing, selection). Spring physics rather than fixed duration.
export const springTransition: Transition = {
	type: "spring",
	stiffness: 400,
	damping: 30,
};

// Fade + small upward slide — for content appearing (e.g. detail panel).
export const fadeInUp: Variants = {
	hidden: { opacity: 0, y: 6 },
	visible: { opacity: 1, y: 0 },
};

// Simple fade — for subtle swaps where motion should be minimal.
export const fade: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1 },
};

// Container that staggers its children's entrance (for lists).
export const staggerContainer: Variants = {
	hidden: { opacity: 1 }, // container itself stays visible; children animate
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.03, // each child starts 30ms after the previous
		},
	},
};

// A single list item's entrance: fade + slide up slightly.
export const staggerItem: Variants = {
	hidden: { opacity: 0, y: 4 },
	visible: { opacity: 1, y: 0 },
};

// ---- Marketing / storytelling variants (landing page) ----
// Everything above this line is tuned for a dense, daily-use UI: small
// distances, fast durations, because the user is looking right at the
// element when it changes. The landing page is different — sections scroll
// into view one at a time and each one is trying to make a point, so these
// variants use a bigger, slower motion that reads as a deliberate reveal
// rather than a UI micro-interaction.

// Scroll-triggered section reveal: a larger rise than fadeInUp (24px vs 6px)
// and paired with revealTransition's slower duration below. Used with
// `whileInView` + `viewport={{ once: true }}` so it plays once, the first
// time a section scrolls into view, then leaves it alone.
export const revealUp: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: { opacity: 1, y: 0 },
};

export const revealTransition: Transition = {
	duration: 0.7,
	ease: [0.25, 0.1, 0.25, 1],
};

// Pop-in for small emphasis elements (a verdict badge, a heatmap cell).
// Pair with springTransition for a "landing with a bit of bounce" feel, or
// with `transition` for a calmer, non-bouncy pop.
export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.6 },
	visible: { opacity: 1, scale: 1 },
};

// Same idea as staggerContainer, but slower: 120ms between children instead
// of 30ms. The app's staggerContainer is tuned so a 20-row list doesn't take
// visibly long to finish animating. The landing page wants the opposite —
// each row appearing should be individually noticeable, because the row
// itself is the demonstration, not just decoration around real content.
export const staggerContainerSlow: Variants = {
	hidden: { opacity: 1 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.12,
		},
	},
};
