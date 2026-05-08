export type ExamEntry = {
  Date: string;
  Slot: string;
  Time: string;
  Course: string;
  Module: string;
};

/** Term-end schedule keyed by programme / branch label (May 2026). */
export const EXAM_SCHEDULE_BY_BRANCH: Record<string, ExamEntry[]> = {
  "SY BTech IT": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "IT2310:Software Engineering and Project Management",
      Module: "Module-4",
    },
  ],
  "SY BTech Instru": [
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "IC2306:Signal and Image Processing",
      Module: "Module-4",
    },
  ],
  "SY BTech ET": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "ET2308:Control Systems",
      Module: "Module-4",
    },
  ],
  "SY BTech CSE-DS": [
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "DS2012:Machine Learning",
      Module: "Module-4",
    },
  ],
  "SY BTech Mech": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "ME2301:Engineering Materials",
      Module: "Module-3",
    },
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "ME2306:Fluid Engineering",
      Module: "Module-4",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "ME2309:Kinematics of machines and mechanisms",
      Module: "Module-4",
    },
  ],
  "SY BTech CSE-SE": [
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "SE2011:Big Data Analytics",
      Module: "Module-4",
    },
  ],
  "SY BTech Civil": [
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "CV2011:Geotechnical Engineering",
      Module: "Module-4",
    },
  ],
  "SY BTech CSE-AI": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "CI2019:Data Communication and Networking",
      Module: "Module-4",
    },
  ],
  "SY BTech CSE-CBI": [
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-1",
      Time: "10.30 am - 12:00 n",
      Course: "CB2012:Computer Networks",
      Module: "Module-4",
    },
  ],
  "TY BTech Chemical": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "CH3296:Process Modeling and Simulation",
      Module: "Module-6",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "CH3297:Petroleum Refinery  and Petrochemical Engineering",
      Module: "Module-6",
    },
  ],
  "TY BTech Computer": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "CS3053:Compiler Design",
      Module: "Module-5&6",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "CS3061:Software Design and Modeling",
      Module: "Module-5",
    },
  ],
  "TY BTech IT": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "IT3215:Design and Analysis of Algorithms",
      Module: "Module-5",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "IT3218:Artificial Intellegence",
      Module: "Module-5",
    },
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-4",
      Time: "4.30 pm -    6 pm",
      Course: "IT3229:Cloud Computing",
      Module: "Module-6",
    },
  ],
  "TY BTech Instru": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "IC3260:Instrumentation Project Engineering",
      Module: "Module-6",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-2",
      Time: "12.30 pm -        2 pm",
      Course: "IC3234:Building and Process Automation",
      Module: "Module-6",
    },
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-4",
      Time: "4.30 pm -    6 pm",
      Course: "IC3222:Batch Process Control",
      Module: "Module-6",
    },
  ],
  "TY BTech Mechanical": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-3",
      Time: "2.30 pm -    4 pm",
      Course: "ME3262: Dynamics of Machine",
      Module: "Module-5",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-3",
      Time: "2.30 pm -    4 pm",
      Course: "ME3263:Hybrid and Electric Vehicles",
      Module: "Module-5",
    },
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-4",
      Time: "4.30 pm -    6 pm",
      Course: "ME3266:Applied Thermal Engineering",
      Module: "Module-6",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-4",
      Time: "4.30 pm -    6 pm",
      Course: "ME3301:Materials and Process Engineering",
      Module: "Module-6",
    },
  ],
  "TY BTech ETC": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-3",
      Time: "2.30 pm -    4 pm",
      Course: "ET3206:Digital Design",
      Module: "Module-5",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-3",
      Time: "2.30 pm -    4 pm",
      Course: "ET3274:Operating Systems",
      Module: "Module-6",
    },
  ],
  "TY BTech AIDS": [
    {
      Date: "Monday, 25th May 2026",
      Slot: "Slot-3",
      Time: "2.30 pm -    4 pm",
      Course: "AI3003:Statistical Inference",
      Module: "Module-5",
    },
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-3",
      Time: "2.30 pm -    4 pm",
      Course: "AI3011:Complexity Algorithms",
      Module: "Module-6",
    },
  ],
  "TY BTech CSE-AIML": [
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-4",
      Time: "4.30 pm -    6 pm",
      Course: "ML3008:Software Engineering",
      Module: "Module-6",
    },
  ],
  "TY BTech CSE-AI": [
    {
      Date: "Tuesday, 26th May 2026",
      Slot: "Slot-4",
      Time: "4.30 pm -    6 pm",
      Course: "CI3007:Software Engineering",
      Module: "Module-6",
    },
  ],
};

function isSecondYearBranch(branch: string): boolean {
  return branch.startsWith("SY ");
}

/** Branches alphabetically within second year (SY) and third year (TY). */
export function getExamsSortedByBranch(): {
  secondYear: [string, ExamEntry[]][];
  thirdYear: [string, ExamEntry[]][];
} {
  const entries = Object.entries(EXAM_SCHEDULE_BY_BRANCH);
  const secondYear = entries.filter(([k]) => isSecondYearBranch(k)).sort(([a], [b]) => a.localeCompare(b));
  const thirdYear = entries.filter(([k]) => !isSecondYearBranch(k)).sort(([a], [b]) => a.localeCompare(b));
  return { secondYear, thirdYear };
}

/** Programme year codes as used in schedule keys (`SY BTech …`, `TY BTech …`). */
export type ExamYearCode = "SY" | "TY";

export const EXAM_YEAR_OPTIONS: readonly { value: ExamYearCode; label: string }[] = [
  { value: "SY", label: "Second year (SY)" },
  { value: "TY", label: "Third year (TY)" },
] as const;

const YEAR_KEY_PREFIX: Record<ExamYearCode, string> = {
  SY: "SY BTech ",
  TY: "TY BTech ",
};

/** Branch choices for a year: `key` is the full schedule key; `label` is the part after `SY BTech` / `TY BTech`. */
export function getBranchOptionsForYear(year: ExamYearCode): { key: string; label: string }[] {
  const prefix = YEAR_KEY_PREFIX[year];
  return Object.keys(EXAM_SCHEDULE_BY_BRANCH)
    .filter((k) => k.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, label: key.slice(prefix.length) }));
}

export function getExamsForScheduleKey(scheduleKey: string): ExamEntry[] | undefined {
  return EXAM_SCHEDULE_BY_BRANCH[scheduleKey];
}
