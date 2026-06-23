import { useState } from "react";
import { DailyAnalytics } from "@/types";
import DayModal from "@/components/DayModal";

interface CalendarProps {
	analytics: DailyAnalytics[];
	year: number;
	month: number; // 0-indexed
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export default function Calendar({ analytics, year, month }: CalendarProps) {
	const byDate = new Map(analytics.map((d) => [d.date, d]));

	const [selectedDay, setSelectedDay] = useState<DailyAnalytics | null>(null);

	const firstDay = new Date(year, month, 1);
	const startWeekday = firstDay.getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();

	const cells: (number | null)[] = [];
	for (let i = 0; i < startWeekday; i++) cells.push(null);
	for (let day = 1; day <= daysInMonth; day++) cells.push(day);

	function dateKey(day: number): string {
		const mm = String(month + 1).padStart(2, "0");
		const dd = String(day).padStart(2, "0");
		return `${year}-${mm}-${dd}`;
	}

	// Today's date — for highlighting the current day and weekday.
	const today = new Date();
	const isCurrentMonth =
		today.getFullYear() === year && today.getMonth() === month;
	const todayDate = today.getDate();
	const todayWeekday = today.getDay();

	return (
		<div className="mx-auto w-full max-w-5xl p-4 md:p-6">
			{/* Header + legend */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-lg font-semibold text-ink">
					{MONTH_NAMES[month]} {year}
				</h2>
				<div className="flex items-center gap-3 text-xs text-ink-soft">
					<span className="flex items-center gap-1.5">
						<span className="h-2 w-2 rounded-full bg-important" />
						Important
					</span>
					<span className="flex items-center gap-1.5">
						<span className="h-2 w-2 rounded-full bg-routine" />
						Routine
					</span>
					<span className="flex items-center gap-1.5">
						<span className="h-2 w-2 rounded-full bg-junk" />
						Junk
					</span>
				</div>
			</div>

			{/* Calendar frame */}
			<div className="rounded-xl border border-border bg-canvas p-3 shadow-sm md:p-4">
				<div className="grid grid-cols-7 gap-2">
					{WEEKDAYS.map((wd, i) => {
						const isToday = isCurrentMonth && i === todayWeekday;
						return (
							<div
								key={wd}
								className={`pb-1 text-center text-xs font-semibold uppercase tracking-wide ${
									isToday ? "text-accent" : "text-ink-faint"
								}`}
							>
								{wd}
							</div>
						);
					})}
					{/* Day cells */}
					{cells.map((day, index) => {
						if (day === null) {
							return <div key={`pad-${index}`} />;
						}
						const data = byDate.get(dateKey(day));
						const hasData = data !== undefined;
						const isToday = isCurrentMonth && day === todayDate;

						return (
							<button
								key={day}
								onClick={() => {
									if (data) setSelectedDay(data);
								}}
								className={`flex aspect-square flex-col rounded-lg border p-2 text-left transition-colors md:cursor-default! ${
									isToday
										? "border-accent bg-accent-soft"
										: hasData
											? "border-border bg-surface shadow-sm hover:bg-surface-hover"
											: "border-border bg-canvas"
								}`}
							>
								{/* Day number */}
								<div
									className={`text-xs font-semibold ${
										isToday
											? "text-accent"
											: hasData
												? "text-ink-soft"
												: "text-ink-faint"
									}`}
								>
									{day}
								</div>

								{data && (
									<div className="mt-auto flex flex-col gap-1.5">
										{/* Important callout — the headline */}
										{data.IMPORTANT > 0 && (
											<div className="hidden  items-baseline gap-1 md:flex">
												<span className="text-lg font-semibold tabular-nums text-important leading-none">
													{data.IMPORTANT}
												</span>
												<span className="text-[10px] uppercase tracking-wide text-ink-faint">
													important
												</span>
											</div>
										)}

										{/* Total + composition bar */}
										<div className="flex flex-col gap-1">
											<span className="hidden text-[11px] tabular-nums text-ink-soft md:block">
												{data.total} total
											</span>
											<div className="flex h-1.5 overflow-hidden rounded-full bg-canvas">
												{data.IMPORTANT > 0 && (
													<div
														className="bg-important"
														style={{ flex: data.IMPORTANT }}
													/>
												)}
												{data.ROUTINE > 0 && (
													<div
														className="bg-routine"
														style={{ flex: data.ROUTINE }}
													/>
												)}
												{data.JUNK > 0 && (
													<div
														className="bg-junk"
														style={{ flex: data.JUNK }}
													/>
												)}
											</div>
										</div>
									</div>
								)}
							</button>
						);
					})}
				</div>
				<DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
			</div>
		</div>
	);
}
