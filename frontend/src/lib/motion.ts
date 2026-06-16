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
