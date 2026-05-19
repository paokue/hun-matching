import { differenceInYears } from "date-fns";

export function calculateAge(dateOfBirth: string | Date): number {
  return differenceInYears(new Date(), new Date(dateOfBirth));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateProfileId(name: string, numbers: string): string {
  const cleanName = name.replace(/\s+/g, "").replace(/[^a-zA-Z]/g, "");
  const cleanNumbers = numbers.replace(/[^0-9]/g, "");
  return `${cleanName}${cleanNumbers}`;
}

// Generates a random unique profile ID, e.g. "HMK4X2P8"
export function autoProfileId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `HM${rand}`;
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export const OCCUPATIONS = [
  "Student",
  "Employee",
  "Business Owner",
  "Freelancer",
  "Other",
] as const;

export const EDUCATION_LEVELS = [
  "Primary School (Grade 1–5)",
  "Secondary School (Grade 6–7)",
  "High School (Grade 8–12)",
  "Vocational Certificate",
  "Bachelor's Degree",
  "Master's Degree",
  "Other",
] as const;

export const MARITAL_STATUS = ["Single", "Previously Married"] as const;

export const TATTOO_STATUS = ["Has Tattoo", "No Tattoo"] as const;

export const ETHNICITIES = ["Hmong", "Lao", "Khmu", "Other"] as const;

export const RELIGIONS = [
  "Buddhism",
  "Christianity",
  "Animism",
  "Other",
] as const;

export const LAO_PROVINCES = [
  "Vientiane Capital",
  "Phongsali",
  "Luang Namtha",
  "Oudomxay",
  "Bokeo",
  "Luang Prabang",
  "Huaphanh",
  "Xayabury",
  "Xiengkhuang",
  "Vientiane Province",
  "Borikhamxay",
  "Khammuane",
  "Savannakhet",
  "Salavan",
  "Xekong",
  "Champasak",
  "Attapeu",
  "Xaisomboun",
] as const;
