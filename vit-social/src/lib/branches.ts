export type BranchConfig = {
  branch: string;
  divisions: string[];
  total_divisions: number;
};

export const BRANCH_CONFIG: readonly BranchConfig[] = [
  { branch: "AIDS", divisions: ["A", "B", "C", "D", "E", "F"], total_divisions: 6 },
  {
    branch: "CS",
    divisions: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
    total_divisions: 12,
  },
  { branch: "CSAI", divisions: ["A", "B", "C", "D", "E", "F"], total_divisions: 6 },
  { branch: "CSAIML", divisions: ["A", "B", "C", "D", "E", "F"], total_divisions: 6 },
  { branch: "CSCBI", divisions: ["A", "B", "C"], total_divisions: 3 },
  { branch: "CSDS", divisions: ["A", "B", "C"], total_divisions: 3 },
  { branch: "CSSE", divisions: ["A", "B", "C"], total_divisions: 3 },
  { branch: "CV", divisions: ["A"], total_divisions: 1 },
  { branch: "ET", divisions: ["A", "B", "C", "D", "E", "F"], total_divisions: 6 },
  { branch: "IC", divisions: ["A", "B", "C"], total_divisions: 3 },
  { branch: "IT", divisions: ["A", "B", "C", "D", "E", "F"], total_divisions: 6 },
  { branch: "ME", divisions: ["A", "B", "C", "D", "E", "F"], total_divisions: 6 },
] as const;

const branchesByCode = new Map<string, BranchConfig>(
  BRANCH_CONFIG.map((row) => [row.branch, row]),
);

export function getDivisionsForBranch(branchCode: string): string[] {
  return branchesByCode.get(branchCode)?.divisions ?? [];
}

export function isValidBranchDivision(branch: string, division: string): boolean {
  const row = branchesByCode.get(branch);
  if (!row) {
    return false;
  }
  return row.divisions.includes(division);
}
