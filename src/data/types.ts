import type { TicketStatus } from "../lib/status";
import type { Id } from "./ids";

export type Ticket = {
  _id: Id<"tickets">;
  ticketKey: string;
  title: string;
  description: string;
  teamId: Id<"teams">;
  assigneeId?: Id<"users">;
  status: TicketStatus;
  blockedFromStatus?: TicketStatus;
  sprintId?: Id<"sprints">;
  muted: boolean;
  completed: boolean;
  statusChangedAt: number;
  inBacklog: boolean;
  plannedDevStart?: string;
  plannedDevEnd?: string;
  plannedTestingStart?: string;
  plannedTestingEnd?: string;
  actualDevStart?: string;
  actualDevEnd?: string;
  actualTestingStart?: string;
  actualTestingEnd?: string;
  createdAt: number;
  createdBy: Id<"users">;
  assignee: { _id: Id<"users">; name: string } | null;
  team: { _id: Id<"teams">; name: string; color: string };
  sprint: {
    _id: Id<"sprints">;
    name: string;
    startDate: string;
    endDate: string;
    status: "planning" | "active" | "completed";
  } | null;
  createdByName: string;
};
