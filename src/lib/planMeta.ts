// ── Plan metadata types ──────────────────────────────────────────────────────
// Stored as Json? on Subscription and Alternative — only populated for
// "téléphonie mobile" and "internet box" categories.

export interface MobilePlanMeta {
  dataGb: number | null; // null = unlimited
  unlimitedData: boolean;
  unlimitedCalls: boolean;
  unlimitedSms: boolean;
  options: string[]; // "roaming_europe" | "hotspot" | "vowifi"
}

export interface InternetPlanMeta {
  downloadSpeedMbps: number;
  tvIncluded: boolean;
  options: string[]; // "wifi6" | "wifi6e" | "tv4k"
}

export type PlanMeta = MobilePlanMeta | InternetPlanMeta;

// ── Option catalogues (shared between form and panel) ────────────────────────

export const MOBILE_OPTIONS: { value: string; label: string }[] = [
  { value: "roaming_europe", label: "Roaming Europe inclus" },
  { value: "hotspot", label: "Partage de connexion (hotspot)" },
  { value: "vowifi", label: "Appels Wi-Fi (VoWiFi)" },
];

export const INTERNET_OPTIONS: { value: string; label: string }[] = [
  { value: "wifi6", label: "Wi-Fi 6" },
  { value: "wifi6e", label: "Wi-Fi 6E" },
  { value: "tv4k", label: "TV 4K" },
];

export const INTERNET_SPEEDS = [100, 200, 500, 1000, 2000, 8000] as const;

// ── Type guards ──────────────────────────────────────────────────────────────

export function isMobileMeta(v: unknown): v is MobilePlanMeta {
  return (
    typeof v === "object" &&
    v !== null &&
    "unlimitedCalls" in v &&
    "unlimitedSms" in v
  );
}

export function isInternetMeta(v: unknown): v is InternetPlanMeta {
  return (
    typeof v === "object" &&
    v !== null &&
    "downloadSpeedMbps" in v
  );
}

// ── Comparison ───────────────────────────────────────────────────────────────
// Returns true if `candidate` meets or exceeds the characteristics in `required`.

export function meetsRequirements(required: PlanMeta, candidate: unknown): boolean {
  if (isMobileMeta(required)) {
    if (!isMobileMeta(candidate)) return false;

    // Data check: candidate must cover at least as much data
    if (required.unlimitedData) {
      if (!candidate.unlimitedData) return false;
    } else if (required.dataGb !== null) {
      const candidateGb = candidate.unlimitedData ? Infinity : (candidate.dataGb ?? 0);
      if (candidateGb < required.dataGb) return false;
    }

    if (required.unlimitedCalls && !candidate.unlimitedCalls) return false;
    if (required.unlimitedSms && !candidate.unlimitedSms) return false;

    for (const opt of required.options) {
      if (!candidate.options.includes(opt)) return false;
    }
    return true;
  }

  if (isInternetMeta(required)) {
    if (!isInternetMeta(candidate)) return false;
    if (candidate.downloadSpeedMbps < required.downloadSpeedMbps) return false;
    if (required.tvIncluded && !candidate.tvIncluded) return false;
    for (const opt of required.options) {
      if (!candidate.options.includes(opt)) return false;
    }
    return true;
  }

  return true;
}

// ── Default states (for form initialisation) ─────────────────────────────────

export const DEFAULT_MOBILE_META: MobilePlanMeta = {
  dataGb: 50,
  unlimitedData: false,
  unlimitedCalls: true,
  unlimitedSms: true,
  options: [],
};

export const DEFAULT_INTERNET_META: InternetPlanMeta = {
  downloadSpeedMbps: 1000,
  tvIncluded: true,
  options: [],
};
