export const ROOMMATE_CAMPUSES = ["Kondhwa", "Bibwewadi"] as const;
export type RoommateCampus = (typeof ROOMMATE_CAMPUSES)[number];

export const ROOMMATE_GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export type RoommateGender = (typeof ROOMMATE_GENDER_OPTIONS)[number]["value"];

export function isRoommateGender(value: string): value is RoommateGender {
  return value === "male" || value === "female" || value === "other";
}

export function isRoommateCampus(value: string): value is RoommateCampus {
  return value === "Kondhwa" || value === "Bibwewadi";
}

export function formatRoommateGenderLabel(value: string | null): string {
  if (!value) {
    return "—";
  }
  const row = ROOMMATE_GENDER_OPTIONS.find((item) => item.value === value);
  return row?.label ?? value;
}
