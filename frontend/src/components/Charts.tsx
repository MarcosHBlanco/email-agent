import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from "recharts";
import { DailyAnalytics } from "@/types";

interface ChartsProps {
	analytics: DailyAnalytics[];
}

// Format "2026-06-15" -> "Jun 15" for axis labels.
function shortDate(dateStr: string): string {
	const [, month, day] = dateStr.split("-").map(Number);
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	return `${months[month - 1]} ${day}`;
}

export default function Charts({ analytics }: ChartsProps) {
	// Prepare data with a short label for the x-axis.
	const data = analytics.map((d) => {
		return {
			...d,
			label: shortDate(d.date),
		};
	});

	if (data.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-sm text-ink-faint">
					No data yet. Process some emails to see trends.
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:p-6">
			{/* Chart 1 — stacked composition over time */}
			<section>
				<h3 className="mb-3 text-sm font-semibold text-ink">
					Email composition over time
				</h3>
				<div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
					<ResponsiveContainer width="100%" height={280}>
						<BarChart data={data}>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="var(--color-border)"
							/>
							<XAxis
								dataKey="label"
								tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
								stroke="var(--color-border)"
							/>
							<YAxis
								tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
								stroke="var(--color-border)"
							/>
							<Tooltip
								cursor={{ fill: "var(--color-surface-hover)", opacity: 0.4 }}
								contentStyle={{
									background: "var(--color-surface)",
									border: "1px solid var(--color-border)",
									borderRadius: "0.5rem",
									fontSize: "0.8rem",
								}}
								labelStyle={{ color: "var(--color-ink)" }}
							/>
							<Legend wrapperStyle={{ fontSize: "0.8rem" }} />
							<Bar
								dataKey="IMPORTANT"
								stackId="a"
								fill="var(--color-important)"
								name="Important"
							/>
							<Bar
								dataKey="ROUTINE"
								stackId="a"
								fill="var(--color-routine)"
								name="Routine"
							/>
							<Bar
								dataKey="JUNK"
								stackId="a"
								fill="var(--color-junk)"
								name="Junk"
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</section>

			{/* Chart 2 — important volume trend */}
			<section>
				<h3 className="mb-3 text-sm font-semibold text-ink">
					Important emails trend
				</h3>
				<div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
					<ResponsiveContainer width="100%" height={240}>
						<LineChart data={data}>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="var(--color-border)"
							/>
							<XAxis
								dataKey="label"
								tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
								stroke="var(--color-border)"
							/>
							<YAxis
								tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
								stroke="var(--color-border)"
							/>
							<Tooltip
								contentStyle={{
									background: "var(--color-surface)",
									border: "1px solid var(--color-border)",
									borderRadius: "0.5rem",
									fontSize: "0.8rem",
								}}
								labelStyle={{ color: "var(--color-ink)" }}
							/>
							<Line
								type="monotone"
								dataKey="IMPORTANT"
								stroke="var(--color-important)"
								strokeWidth={2}
								dot={{ fill: "var(--color-important)" }}
								name="Important"
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</section>
		</div>
	);
}
