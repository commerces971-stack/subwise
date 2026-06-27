export const CATEGORIES = [
  "téléphonie mobile",
  "internet box",
  "streaming",
  "assurance auto",
  "assurance habitation",
  "mutuelle santé",
  "salle de sport",
] as const;

export type Category = (typeof CATEGORIES)[number];
