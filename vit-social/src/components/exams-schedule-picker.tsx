"use client";

import { useMemo, useState } from "react";
import {
  EXAM_YEAR_OPTIONS,
  getBranchOptionsForYear,
  getExamsForScheduleKey,
  type ExamEntry,
  type ExamYearCode,
} from "@/lib/exams-schedule";

function ExamTable({ rows }: { rows: ExamEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[color:var(--fb-divider)] bg-[#fafbfc] text-[#4b4f56]">
            <th className="px-3 py-2 font-bold">Date</th>
            <th className="px-3 py-2 font-bold">Slot</th>
            <th className="px-3 py-2 font-bold">Time</th>
            <th className="px-3 py-2 font-bold">Course</th>
            <th className="px-3 py-2 font-bold">Module</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.Course}-${row.Date}-${row.Slot}-${i}`}
              className="border-b border-[color:var(--fb-divider)] last:border-b-0 [&:nth-child(even)]:bg-[#fafbfc]"
            >
              <td className="whitespace-nowrap px-3 py-2 text-[var(--fb-text)]">{row.Date}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--fb-text-dim)]">{row.Slot}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--fb-text-dim)]">{row.Time}</td>
              <td className="px-3 py-2 text-[var(--fb-text)]">{row.Course}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--fb-text-dim)]">{row.Module}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExamsSchedulePicker() {
  const [year, setYear] = useState<ExamYearCode | "">("");
  const [scheduleKey, setScheduleKey] = useState("");

  const branchOptions = useMemo(() => {
    if (!year) {
      return [];
    }
    return getBranchOptionsForYear(year);
  }, [year]);

  const exams = scheduleKey ? getExamsForScheduleKey(scheduleKey) : undefined;

  return (
    <div className="space-y-6">
      <div className="fb-panel overflow-hidden p-4 sm:p-5">
        <p className="m-0 text-sm font-bold text-[#0e385f]">Your programme</p>
        <p className="m-0 mt-1 text-xs text-[color:var(--fb-text-dim)]">
          Choose your B.Tech year and branch to see your papers (25–26 May 2026).
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="exam-year" className="mb-1.5 block text-xs font-bold text-[#4b4f56]">
              Year
            </label>
            <select
              id="exam-year"
              className="fb-input box-border max-w-full"
              value={year}
              onChange={(e) => {
                const v = e.target.value;
                setYear(v === "" ? "" : (v as ExamYearCode));
                setScheduleKey("");
              }}
            >
              <option value="">Select year…</option>
              {EXAM_YEAR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exam-branch" className="mb-1.5 block text-xs font-bold text-[#4b4f56]">
              Branch
            </label>
            <select
              id="exam-branch"
              className="fb-input box-border max-w-full"
              value={scheduleKey}
              disabled={!year}
              onChange={(e) => setScheduleKey(e.target.value)}
            >
              <option value="">{year ? "Select branch…" : "Pick a year first"}</option>
              {branchOptions.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {year && scheduleKey && (!exams || exams.length === 0) ? (
        <p
          className="border border-[color:var(--fb-error-border)] bg-[color:var(--fb-error-bg)] px-3 py-2 text-center text-sm text-[color:var(--fb-error-text)]"
          role="status"
        >
          No exams are listed for this combination yet.
        </p>
      ) : null}

      {exams && exams.length > 0 ? (
        <article className="fb-panel overflow-hidden">
          <header className="fb-panel-header">
            <h2 className="m-0 text-[15px] font-bold text-[#0e385f]">Your exams</h2>
            <p className="m-0 mt-1 text-xs text-[color:var(--fb-text-dim)]">{scheduleKey}</p>
          </header>
          <ExamTable rows={exams} />
        </article>
      ) : year && scheduleKey ? (
        null
      ) : (
        <div
          className="fb-panel border border-dashed border-[color:var(--fb-panel-border)] bg-[#fafbfc] p-6 text-center text-sm text-[color:var(--fb-text-dim)]"
          role="status"
        >
          Select your year and branch to load your exam timetable.
        </div>
      )}
    </div>
  );
}
