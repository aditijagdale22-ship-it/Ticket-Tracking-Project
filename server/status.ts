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

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New",
  under_review: "Under Review / PRD",
  groomed: "Groomed",
  in_progress: "In Progress",
  testing: "Testing",
  done: "Done",
  blocked: "Blocked",
  rejected: "Rejected",
};

const BLOCKABLE: ReadonlySet<string> = new Set([
  "under_review",
  "groomed",
  "in_progress",
  "testing",
]);

export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  if (to === "rejected") return true;
  if (to === "blocked") return BLOCKABLE.has(from);
  if (from === "blocked") return to !== "new" && to !== "done";
  if (from === "rejected") return to === "new";
  return PIPELINE_STATUSES.includes(from as (typeof PIPELINE_STATUSES)[number]) &&
    PIPELINE_STATUSES.includes(to as (typeof PIPELINE_STATUSES)[number]);
}

export function datesForStatusChange(
  to: TicketStatus,
  current: {
    actualDevStart?: string;
    actualDevEnd?: string;
    actualTestingStart?: string;
    actualTestingEnd?: string;
  },
  today: string,
) {
  const next: {
    actualDevStart?: string;
    actualDevEnd?: string;
    actualTestingStart?: string;
    actualTestingEnd?: string;
  } = {};
  if (to === "in_progress" && !current.actualDevStart) next.actualDevStart = today;
  if (to === "testing") {
    if (!current.actualDevEnd) next.actualDevEnd = today;
    if (!current.actualTestingStart) next.actualTestingStart = today;
  }
  if (to === "done" && !current.actualTestingEnd) next.actualTestingEnd = today;
  return next;
}
