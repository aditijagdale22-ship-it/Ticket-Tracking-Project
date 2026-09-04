export const PIPELINE_STATUSES = [
  "new",
  "under_review",
  "groomed",
  "in_progress",
  "testing",
  "done",
] as const;

export const SIDE_STATUSES = ["blocked", "rejected"] as const;

export const ALL_STATUSES = [...PIPELINE_STATUSES, ...SIDE_STATUSES] as const;

export type TicketStatus = (typeof ALL_STATUSES)[number];

export const STATUS_META: Record<
  TicketStatus,
  { label: string; short: string; tone: string; meaning: string }
> = {
  new: {
    label: "New",
    short: "New",
    tone: "slate",
    meaning: "Raised, not yet looked at",
  },
  under_review: {
    label: "Under Review / PRD",
    short: "Review",
    tone: "blue",
    meaning: "Being scoped; PRD being written",
  },
  groomed: {
    label: "Groomed",
    short: "Groomed",
    tone: "violet",
    meaning: "PRD done, estimated, ready for a sprint",
  },
  in_progress: {
    label: "In Progress",
    short: "In Progress",
    tone: "amber",
    meaning: "Actively being built",
  },
  testing: {
    label: "Testing",
    short: "QA",
    tone: "cyan",
    meaning: "Dev complete, in QA/testing",
  },
  done: {
    label: "Done",
    short: "Done",
    tone: "green",
    meaning: "Testing passed, shipped",
  },
  blocked: {
    label: "Blocked",
    short: "Blocked",
    tone: "red",
    meaning: "Stalled on a dependency",
  },
  rejected: {
    label: "Rejected",
    short: "Rejected",
    tone: "rose",
    meaning: "Will not be done",
  },
};

export const STATUS_PILL: Record<TicketStatus, string> = {
  new: "bg-stone-200 text-stone-800",
  under_review: "bg-sky-100 text-sky-900",
  groomed: "bg-violet-100 text-violet-900",
  in_progress: "bg-amber-100 text-amber-950",
  testing: "bg-cyan-100 text-cyan-950",
  done: "bg-emerald-100 text-emerald-900",
  blocked: "bg-red-100 text-red-900",
  rejected: "bg-rose-100 text-rose-900",
};

export const COLUMN_ACCENT: Record<TicketStatus, string> = {
  new: "border-t-stone-400",
  under_review: "border-t-sky-500",
  groomed: "border-t-violet-500",
  in_progress: "border-t-amber-500",
  testing: "border-t-cyan-500",
  done: "border-t-emerald-500",
  blocked: "border-t-red-500",
  rejected: "border-t-rose-400",
};

const BLOCKABLE: ReadonlySet<TicketStatus> = new Set([
  "under_review",
  "groomed",
  "in_progress",
  "testing",
]);

export function allowedNextStatuses(from: TicketStatus): TicketStatus[] {
  const next: TicketStatus[] = [];
  for (const status of ALL_STATUSES) {
    if (status === from) continue;
    if (status === "rejected") {
      next.push(status);
      continue;
    }
    if (status === "blocked") {
      if (BLOCKABLE.has(from)) next.push(status);
      continue;
    }
    if (from === "blocked") {
      if (status !== "new" && status !== "done") next.push(status);
      continue;
    }
    if (from === "rejected") {
      if (status === "new") next.push(status);
      continue;
    }
    if (
      PIPELINE_STATUSES.includes(from as (typeof PIPELINE_STATUSES)[number]) &&
      PIPELINE_STATUSES.includes(status as (typeof PIPELINE_STATUSES)[number])
    ) {
      next.push(status);
    }
  }
  return next;
}
