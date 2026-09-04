import { PIPELINE_STATUSES, TicketStatus } from "./status";

function isPipeline(status: TicketStatus): status is (typeof PIPELINE_STATUSES)[number] {
  return (PIPELINE_STATUSES as readonly TicketStatus[]).includes(status);
}

export type HistoryRow = {
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  timestamp: number;
};

export type LifecycleSegment = {
  status: TicketStatus;
  start: number;
  end: number;
};

export type BlockedSpan = {
  start: number;
  end: number;
};

export function buildLifecycle(
  history: HistoryRow[],
  now: number,
): { segments: LifecycleSegment[]; blocked: BlockedSpan[] } {
  const events = [...history].sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) {
    return { segments: [], blocked: [] };
  }

  const segments: LifecycleSegment[] = [];
  const blocked: BlockedSpan[] = [];
  let current: TicketStatus = events[0]?.toStatus ?? "new";
  let currentStart = events[0]?.timestamp ?? now;
  let blockStart: number | null = current === "blocked" ? currentStart : null;
  let pipelineBeforeBlock: TicketStatus = "new";

  for (let i = 1; i < events.length; i += 1) {
    const event = events[i];
    if (!event) continue;
    if (event.toStatus === "blocked") {
      if (current !== "blocked") {
        segments.push({ status: current, start: currentStart, end: event.timestamp });
        pipelineBeforeBlock = current;
      }
      blockStart = event.timestamp;
      current = "blocked";
      currentStart = event.timestamp;
      continue;
    }
    if (current === "blocked") {
      if (blockStart !== null) {
        blocked.push({ start: blockStart, end: event.timestamp });
      }
      blockStart = null;
      current = isPipeline(event.toStatus)
        ? event.toStatus
        : pipelineBeforeBlock;
      currentStart = event.timestamp;
      continue;
    }
    if (isPipeline(event.toStatus) || event.toStatus === "rejected") {
      segments.push({ status: current, start: currentStart, end: event.timestamp });
      current = event.toStatus;
      currentStart = event.timestamp;
    }
  }

  if (current === "blocked") {
    if (blockStart !== null) {
      blocked.push({ start: blockStart, end: now });
    }
  } else {
    segments.push({ status: current, start: currentStart, end: now });
  }

  return { segments, blocked };
}
