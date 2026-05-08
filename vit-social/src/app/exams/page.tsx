import type { Metadata } from "next";
import Link from "next/link";
import { ExamsSchedulePicker } from "@/components/exams-schedule-picker";

export const metadata: Metadata = {
  title: "Exams",
  description:
    "Term end exam timetable by year and branch for VIT students — no sign-in required.",
};

export default function ExamsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--fb-bg)] text-[var(--fb-text)]">
      <header
        className="border-b border-[color:var(--fb-blue-darker)] text-white shadow-[0_1px_0_rgba(0,0,0,0.15)]"
        style={{
          background: "linear-gradient(to bottom, #4c6bb8 0%, #3b5998 55%, #365899 100%)",
          fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif",
        }}
      >
        <div className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-y-2 gap-x-3 px-2 py-2 sm:py-3">
          <Link
            href="/"
            className="select-none whitespace-nowrap text-[1.4rem] font-bold leading-none tracking-[-0.5px] text-white no-underline hover:underline sm:text-[1.7rem]"
          >
            vitsocial<span className="font-normal">.xyz</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1.5">
            <Link href="/" className="fb-nav-link">
              Home
            </Link>
            <span className="fb-nav-link" aria-current="page" data-state="active">
              Exams
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[980px] flex-1 px-3 py-8 sm:px-4">
        <div className="fb-panel mb-8 overflow-hidden">
          <div className="fb-panel-header">
            <h1 className="m-0 text-[1.25rem] font-bold leading-tight text-[#0e385f] sm:text-[1.35rem]">
              Term end exams for second year students
            </h1>
            <p className="m-0 mt-2 text-sm text-[color:var(--fb-text-dim)]">
              Pick your year and branch below for your papers. Third year (TY) schedules are included — no account
              required.
            </p>
          </div>
        </div>

        <ExamsSchedulePicker />
      </main>

      <footer
        className="mt-auto border-t border-[color:var(--fb-panel-border)] bg-white/60"
        style={{ fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif" }}
      >
        <div className="mx-auto max-w-[980px] px-4 py-4 text-center text-xs text-[color:var(--fb-text-dim)]">
          <p className="m-0">
            <Link href="/" className="text-[color:var(--fb-link)] hover:underline">
              Home
            </Link>
            <span className="mx-2 text-[color:var(--fb-blue-light)]">|</span>
            <span className="text-[color:var(--fb-text-muted)]">Timings are as published — confirm with your department.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
