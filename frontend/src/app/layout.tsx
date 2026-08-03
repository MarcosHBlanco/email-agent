import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";

const fraunces = Fraunces({
	variable: "--font-display",
	subsets: ["latin"],
	display: "swap",
});

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL("https://siftmail.vercel.app"),
	title: "Sift — See what matters. Sift the rest.",
	description:
		"Sift reads every email, sorts the signal from the clutter, and hands you a calm daily digest of what actually needs you.",
	openGraph: {
		title: "Sift — See what matters. Sift the rest.",
		description: "AI-powered inbox triage. Your email content is never stored.",
		url: "https://siftmail.vercel.app",
		siteName: "Sift",
		type: "website",
		images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sift" }],
	},
	twitter: {
		card: "summary_large_image",
		title: "Sift — See what matters. Sift the rest.",
		description: "AI-powered inbox triage. Your email content is never stored.",
		images: ["/og.png"],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<ThemeProvider>
					<AuthProvider>{children}</AuthProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
