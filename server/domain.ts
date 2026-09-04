import { loadAll, newId, writeTables, type Row, type TableName } from "./db";
import {
  datesForStatusChange,
  isValidTransition,
  PIPELINE_STATUSES,
  STATUS_LABELS,
  type TicketStatus,
} from "./status";

type User = { _id: string; name: string; normalizedName: string; createdAt: number };
type Team = { _id: string; name: string; slug: string; color: string; createdAt: number };
type Sprint = {
  _id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planning" | "active" | "completed";
  createdAt: number;
};
type Ticket = {
  _id: string;
  ticketKey: string;
  title: string;
  description: string;
  teamId: string;
  assigneeId?: string;
  status: TicketStatus;
  blockedFromStatus?: TicketStatus;
  sprintId?: string;
  muted: boolean;
  completed: boolean;
  statusChangedAt: number;
  plannedDevStart?: string;
  plannedDevEnd?: string;
  plannedTestingStart?: string;
  plannedTestingEnd?: string;
  actualDevStart?: string;
  actualDevEnd?: string;
  actualTestingStart?: string;
  actualTestingEnd?: string;
  createdAt: number;
  createdBy: string;
};
type EventRow = {
  _id: string;
  sprintId: string;
  eventType: string;
  ticketId?: string;
  actorId: string;
  timestamp: number;
  description: string;
  oldValue?: string;
  newValue?: string;
};
type HistoryRow = {
  _id: string;
  ticketId: string;
  fromStatus: string | null;
  toStatus: TicketStatus;
  changedBy: string;
  timestamp: number;
  note?: string;
};
type Counter = { _id: string; name: string; value: number };

type State = {
  users: User[];
  teams: Team[];
  sprints: Sprint[];
  tickets: Ticket[];
  sprintEvents: EventRow[];
  statusHistory: HistoryRow[];
  counters: Counter[];
};

const TEAM_SEED = [
  { name: "Product", slug: "product", color: "#b45309" },
  { name: "Engineering", slug: "engineering", color: "#1d4ed8" },
  { name: "Design", slug: "design", color: "#7c3aed" },
  { name: "Data", slug: "data", color: "#0f766e" },
  { name: "Growth", slug: "growth", color: "#be123c" },
] as const;

const DUMMY_ASSIGNEES = [
  "Priya Shah",
  "Jordan Hale",
  "Mina Cho",
  "Alex Rivera",
  "Sam Okonkwo",
] as const;

type SeedTicket = {
  title: string;
  description: string;
  team: string;
  status: TicketStatus;
  sprint: boolean;
  assignee?: string;
  plannedDevStart?: string;
  plannedDevEnd?: string;
};

const DEMO_CASES: Record<TicketStatus, string[]> = {
  new: [
    "Intake: customer-reported login timeout",
    "Request: export board as CSV",
    "Idea: keyboard shortcuts for status",
    "Support: duplicate ticket keys in import",
    "Request: dark mode for the sheet view",
    "Intake: ping on blocked tickets",
  ],
  under_review: [
    "PRD: suggestion intake from Slack",
    "PRD: guest viewers on a team board",
    "Brief: sprint health email digest",
    "PRD: bulk-move tickets between sprints",
    "Spec: saved filters per person",
    "PRD: activity feed on the ticket drawer",
  ],
  groomed: [
    "Board vs sheet toggle polish",
    "Empty-state illustrations for backlog",
    "Weekly ticket aging report",
    "Assignee filter chips on the board",
    "Sprint date range on the workspace header",
    "Confirm before deleting a ticket",
  ],
  in_progress: [
    "Authoritative status for every ticket",
    "Self-serve team creation",
    "Google Sheet write batching",
    "Ticket drawer sprint picker",
    "Dummy assignee roster",
    "Report tab event log copy",
  ],
  testing: [
    "Sprint timeline on the team workspace",
    "Pagination on the all-teams sheet",
    "Status history audit trail",
    "Duplicate ticket from the sheet menu",
    "Completed checkbox on Done tickets",
    "Create ticket with sprint or backlog",
  ],
  done: [
    "Mark shipped tickets complete in the sprint report",
    "Rename workspace to Event Board",
    "Remove mute controls from the board",
    "In Progress column label",
    "Share sheet with the service account",
    "Health tab renamed to Report",
  ],
  blocked: [
    "Blocked on legal copy review",
    "Waiting on SSO vendor sandbox",
    "Design freeze until brand kit lands",
    "Data warehouse access not granted",
    "App store listing copy in legal review",
    "Payment provider KYC stalled",
  ],
  rejected: [
    "Native mobile companion app",
    "Experiment: suggestion voting",
    "Custom theming per team",
    "Public anonymous board links",
    "AI auto-assign from ticket title",
    "Offline-only desktop client",
  ],
};

const TICKET_SEED: SeedTicket[] = (
  Object.entries(DEMO_CASES) as Array<[TicketStatus, string[]]>
).flatMap(([status, titles]) =>
  titles.map((title, index) => {
    const team = TEAM_SEED[index % TEAM_SEED.length]?.slug ?? "product";
    const assignee = DUMMY_ASSIGNEES[index % DUMMY_ASSIGNEES.length];
    const inSprint = status === "rejected" ? index < 2 : index < 4;
    return {
      title,
      description: `${STATUS_LABELS[status]} example: ${title}.`,
      team,
      status,
      sprint: inSprint,
      assignee,
      ...(status === "in_progress" || status === "testing"
        ? { plannedDevStart: "2026-09-01", plannedDevEnd: "2026-09-08" }
        : {}),
    };
  }),
);

function num(value: string | undefined, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function bool(value: string | undefined): boolean {
  return value === "true" || value === "TRUE" || value === "1";
}
function opt(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function parseState(raw: Record<TableName, Row[]>): State {
  return {
    users: raw.users.map((row) => ({
      _id: row._id ?? "",
      name: row.name ?? "",
      normalizedName: row.normalizedName ?? "",
      createdAt: num(row.createdAt),
    })),
    teams: raw.teams.map((row) => ({
      _id: row._id ?? "",
      name: row.name ?? "",
      slug: row.slug ?? "",
      color: row.color ?? "#c2410c",
      createdAt: num(row.createdAt),
    })),
    sprints: raw.sprints.map((row) => ({
      _id: row._id ?? "",
      teamId: row.teamId ?? "",
      name: row.name ?? "",
      startDate: row.startDate ?? "",
      endDate: row.endDate ?? "",
      status: (row.status as Sprint["status"]) || "planning",
      createdAt: num(row.createdAt),
    })),
    tickets: raw.tickets.map((row) => ({
      _id: row._id ?? "",
      ticketKey: row.ticketKey ?? "",
      title: row.title ?? "",
      description: row.description ?? "",
      teamId: row.teamId ?? "",
      assigneeId: opt(row.assigneeId),
      status: (row.status as TicketStatus) || "new",
      blockedFromStatus: opt(row.blockedFromStatus) as TicketStatus | undefined,
      sprintId: opt(row.sprintId),
      muted: bool(row.muted),
      completed: bool(row.completed),
      statusChangedAt: num(row.statusChangedAt, num(row.createdAt)),
      plannedDevStart: opt(row.plannedDevStart),
      plannedDevEnd: opt(row.plannedDevEnd),
      plannedTestingStart: opt(row.plannedTestingStart),
      plannedTestingEnd: opt(row.plannedTestingEnd),
      actualDevStart: opt(row.actualDevStart),
      actualDevEnd: opt(row.actualDevEnd),
      actualTestingStart: opt(row.actualTestingStart),
      actualTestingEnd: opt(row.actualTestingEnd),
      createdAt: num(row.createdAt),
      createdBy: row.createdBy ?? "",
    })),
    sprintEvents: raw.sprintEvents.map((row) => ({
      _id: row._id ?? "",
      sprintId: row.sprintId ?? "",
      eventType: row.eventType ?? "",
      ticketId: opt(row.ticketId),
      actorId: row.actorId ?? "",
      timestamp: num(row.timestamp),
      description: row.description ?? "",
      oldValue: opt(row.oldValue),
      newValue: opt(row.newValue),
    })),
    statusHistory: raw.statusHistory.map((row) => ({
      _id: row._id ?? "",
      ticketId: row.ticketId ?? "",
      fromStatus: opt(row.fromStatus) ?? null,
      toStatus: (row.toStatus as TicketStatus) || "new",
      changedBy: row.changedBy ?? "",
      timestamp: num(row.timestamp),
      note: opt(row.note),
    })),
    counters: raw.counters.map((row) => ({
      _id: row._id ?? "",
      name: row.name ?? "",
      value: num(row.value),
    })),
  };
}

function stringifyTicket(ticket: Ticket): Row {
  return {
    _id: ticket._id,
    ticketKey: ticket.ticketKey,
    title: ticket.title,
    description: ticket.description,
    teamId: ticket.teamId,
    assigneeId: ticket.assigneeId ?? "",
    status: ticket.status,
    blockedFromStatus: ticket.blockedFromStatus ?? "",
    sprintId: ticket.sprintId ?? "",
    muted: ticket.muted ? "true" : "false",
    completed: ticket.completed ? "true" : "false",
    statusChangedAt: String(ticket.statusChangedAt),
    plannedDevStart: ticket.plannedDevStart ?? "",
    plannedDevEnd: ticket.plannedDevEnd ?? "",
    plannedTestingStart: ticket.plannedTestingStart ?? "",
    plannedTestingEnd: ticket.plannedTestingEnd ?? "",
    actualDevStart: ticket.actualDevStart ?? "",
    actualDevEnd: ticket.actualDevEnd ?? "",
    actualTestingStart: ticket.actualTestingStart ?? "",
    actualTestingEnd: ticket.actualTestingEnd ?? "",
    createdAt: String(ticket.createdAt),
    createdBy: ticket.createdBy,
  };
}

function stringifyEvent(row: EventRow): Row {
  return {
    _id: row._id,
    sprintId: row.sprintId,
    eventType: row.eventType,
    ticketId: row.ticketId ?? "",
    actorId: row.actorId,
    timestamp: String(row.timestamp),
    description: row.description,
    oldValue: row.oldValue ?? "",
    newValue: row.newValue ?? "",
  };
}

function stringifyHistory(row: HistoryRow): Row {
  return {
    _id: row._id,
    ticketId: row.ticketId,
    fromStatus: row.fromStatus ?? "",
    toStatus: row.toStatus,
    changedBy: row.changedBy,
    timestamp: String(row.timestamp),
    note: row.note ?? "",
  };
}

async function persist(state: State, dirty: TableName[]) {
  const updates: Partial<Record<TableName, Row[]>> = {};
  if (dirty.includes("users")) {
    updates.users = state.users.map((u) => ({
      _id: u._id,
      name: u.name,
      normalizedName: u.normalizedName,
      createdAt: String(u.createdAt),
    }));
  }
  if (dirty.includes("teams")) {
    updates.teams = state.teams.map((t) => ({
      _id: t._id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      createdAt: String(t.createdAt),
    }));
  }
  if (dirty.includes("sprints")) {
    updates.sprints = state.sprints.map((s) => ({
      _id: s._id,
      teamId: s.teamId,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      status: s.status,
      createdAt: String(s.createdAt),
    }));
  }
  if (dirty.includes("tickets")) {
    updates.tickets = state.tickets.map(stringifyTicket);
  }
  if (dirty.includes("sprintEvents")) {
    updates.sprintEvents = state.sprintEvents.map(stringifyEvent);
  }
  if (dirty.includes("statusHistory")) {
    updates.statusHistory = state.statusHistory.map(stringifyHistory);
  }
  if (dirty.includes("counters")) {
    updates.counters = state.counters.map((c) => ({
      _id: c._id,
      name: c.name,
      value: String(c.value),
    }));
  }
  await writeTables(updates);
}

function requireActor(state: State, actorId: string): User {
  const user = state.users.find((item) => item._id === actorId);
  if (!user) throw new Error("Not authenticated");
  return user;
}

function ensureUserByName(state: State, name: string): User {
  const normalizedName = name.toLowerCase();
  const existing = state.users.find((u) => u.normalizedName === normalizedName);
  if (existing) return existing;
  const user: User = {
    _id: newId("usr"),
    name,
    normalizedName,
    createdAt: Date.now(),
  };
  state.users.push(user);
  return user;
}

function dummyAssigneeSummaries(
  state: State,
  mark: (...tables: TableName[]) => void,
): Array<{ _id: string; name: string }> {
  const before = state.users.length;
  const people = DUMMY_ASSIGNEES.map((name) => ensureUserByName(state, name));
  if (state.users.length !== before) mark("users");
  return people
    .map((u) => ({ _id: u._id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function hydrateTicket(state: State, ticket: Ticket) {
  const team = state.teams.find((item) => item._id === ticket.teamId);
  if (!team) throw new Error("Team not found for ticket");
  const creator = state.users.find((item) => item._id === ticket.createdBy);
  const assignee = ticket.assigneeId
    ? state.users.find((item) => item._id === ticket.assigneeId)
    : undefined;
  const sprint = ticket.sprintId
    ? state.sprints.find((item) => item._id === ticket.sprintId)
    : undefined;
  return {
    ...ticket,
    completed: ticket.completed || ticket.status === "done",
    inBacklog: !ticket.sprintId,
    assignee: assignee ? { _id: assignee._id, name: assignee.name } : null,
    team: { _id: team._id, name: team.name, color: team.color },
    sprint: sprint
      ? {
          _id: sprint._id,
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          status: sprint.status,
        }
      : null,
    createdByName: creator?.name ?? "Unknown",
  };
}

function logEvent(
  state: State,
  args: {
    sprintId?: string;
    eventType: string;
    ticketId?: string;
    actorId: string;
    description: string;
    oldValue?: string;
    newValue?: string;
    timestamp?: number;
  },
) {
  if (!args.sprintId) return;
  state.sprintEvents.push({
    _id: newId("evt"),
    sprintId: args.sprintId,
    eventType: args.eventType,
    ticketId: args.ticketId,
    actorId: args.actorId,
    timestamp: args.timestamp ?? Date.now(),
    description: args.description,
    oldValue: args.oldValue,
    newValue: args.newValue,
  });
}

function nextTicketKey(state: State): string {
  let counter = state.counters.find((item) => item.name === "tickets");
  if (!counter) {
    counter = { _id: newId("cnt"), name: "tickets", value: 0 };
    state.counters.push(counter);
  }
  counter.value += 1;
  return `TKT-${String(counter.value).padStart(4, "0")}`;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function dispatch(op: string, args: Record<string, unknown>): Promise<unknown> {
  const state = parseState(await loadAll());
  const dirty = new Set<TableName>();
  const mark = (...tables: TableName[]) => tables.forEach((table) => dirty.add(table));

  const result = await run(op, args, state, mark);
  if (dirty.size > 0) {
    await persist(state, [...dirty]);
  }
  return result;
}

async function run(
  op: string,
  args: Record<string, unknown>,
  state: State,
  mark: (...tables: TableName[]) => void,
): Promise<unknown> {
  switch (op) {
    case "users.identify": {
      const name = String(args.name ?? "").trim();
      if (!name) throw new Error("Name is required");
      const normalizedName = name.toLowerCase();
      const existing = state.users.find((u) => u.normalizedName === normalizedName);
      if (existing) return existing._id;
      const user: User = {
        _id: newId("usr"),
        name,
        normalizedName,
        createdAt: Date.now(),
      };
      state.users.push(user);
      mark("users");
      return user._id;
    }
    case "users.get": {
      const user = state.users.find((u) => u._id === args.userId);
      return user ? { _id: user._id, name: user.name } : null;
    }
    case "users.list":
    case "users.listPublic": {
      if (op === "users.list") requireActor(state, String(args.actorId));
      return dummyAssigneeSummaries(state, mark);
    }
    case "teams.list": {
      requireActor(state, String(args.actorId));
      return [...state.teams].sort((a, b) => a.name.localeCompare(b.name));
    }
    case "teams.create": {
      requireActor(state, String(args.actorId));
      const name = String(args.name ?? "").trim();
      const slug = slugify(name);
      if (!slug) throw new Error("Team name must include letters or numbers");
      if (state.teams.some((t) => t.slug === slug)) {
        throw new Error("A team with that name already exists");
      }
      const team: Team = {
        _id: newId("team"),
        name,
        slug,
        color: String(args.color ?? "#c2410c"),
        createdAt: Date.now(),
      };
      state.teams.push(team);
      mark("teams");
      return { _id: team._id, name: team.name, color: team.color };
    }
    case "tickets.list": {
      requireActor(state, String(args.actorId));
      let tickets = state.tickets.map((t) => hydrateTicket(state, t));
      if (args.teamId) tickets = tickets.filter((t) => t.teamId === args.teamId);
      if (args.assigneeId) tickets = tickets.filter((t) => t.assigneeId === args.assigneeId);
      if (args.status) tickets = tickets.filter((t) => t.status === args.status);
      if (args.sprintScope === "sprint") tickets = tickets.filter((t) => !t.inBacklog);
      if (args.sprintScope === "backlog") tickets = tickets.filter((t) => t.inBacklog);
      return tickets.sort((a, b) => b.createdAt - a.createdAt);
    }
    case "tickets.get": {
      requireActor(state, String(args.actorId));
      const ticket = state.tickets.find((t) => t._id === args.ticketId);
      if (!ticket) return null;
      const history = state.statusHistory
        .filter((row) => row.ticketId === ticket._id)
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((row) => ({
          ...row,
          changedByName:
            state.users.find((u) => u._id === row.changedBy)?.name ?? "Unknown",
        }));
      return { ticket: hydrateTicket(state, ticket), history };
    }
    case "tickets.create": {
      const actor = requireActor(state, String(args.actorId));
      const title = String(args.title ?? "").trim();
      const description = String(args.description ?? "").trim();
      if (!title || !description) throw new Error("Title and description are required");
      const team = state.teams.find((t) => t._id === args.teamId);
      if (!team) throw new Error("Team not found");
      const status = (String(args.status ?? "new") as TicketStatus) || "new";
      const now = Date.now();
      const ticketKey = nextTicketKey(state);
      const autoDates = datesForStatusChange(status, {}, todayIso());
      let sprintId = opt(String(args.sprintId ?? ""));
      if (args.sprintId) {
        const sprint = state.sprints.find((s) => s._id === args.sprintId);
        if (!sprint) throw new Error("Sprint not found");
        if (sprint.teamId !== args.teamId) throw new Error("Sprint belongs to a different team");
        sprintId = sprint._id;
      }
      const ticket: Ticket = {
        _id: newId("tkt"),
        ticketKey,
        title,
        description,
        teamId: String(args.teamId),
        assigneeId: opt(String(args.assigneeId ?? "")),
        status,
        muted: false,
        completed: status === "done",
        statusChangedAt: now,
        createdAt: now,
        createdBy: actor._id,
        sprintId,
        ...autoDates,
      };
      state.tickets.push(ticket);
      state.statusHistory.push({
        _id: newId("hist"),
        ticketId: ticket._id,
        fromStatus: null,
        toStatus: status,
        changedBy: actor._id,
        timestamp: now,
        note: "Ticket created",
      });
      if (sprintId) {
        const sprint = state.sprints.find((s) => s._id === sprintId);
        const createdDuring = sprint ? now - sprint.createdAt > 60_000 : false;
        logEvent(state, {
          sprintId,
          eventType: createdDuring ? "created_in_sprint" : "added_to_sprint",
          ticketId: ticket._id,
          actorId: actor._id,
          description: createdDuring
            ? `A new ticket, ${title}, was added during the sprint.`
            : `Ticket: ${title} was added to ${sprint?.name ?? "the sprint"}.`,
        });
      }
      mark("tickets", "statusHistory", "sprintEvents", "counters");
      return ticket._id;
    }
    case "tickets.changeStatus": {
      const actor = requireActor(state, String(args.actorId));
      const ticket = state.tickets.find((t) => t._id === args.ticketId);
      if (!ticket) throw new Error("Ticket not found");
      const toStatus = args.toStatus as TicketStatus;
      const fromStatus = ticket.status;
      const fromLabel = STATUS_LABELS[fromStatus];
      const toLabel = STATUS_LABELS[toStatus];
      if (!isValidTransition(fromStatus, toStatus)) {
        throw new Error(`Cannot move from ${fromStatus} to ${toStatus}`);
      }
      const autoDates = datesForStatusChange(toStatus, ticket, todayIso());
      Object.assign(ticket, autoDates);
      if (toStatus === "blocked") ticket.blockedFromStatus = fromStatus;
      else ticket.blockedFromStatus = undefined;
      ticket.status = toStatus;
      ticket.statusChangedAt = Date.now();
      if (toStatus === "done") ticket.completed = true;
      state.statusHistory.push({
        _id: newId("hist"),
        ticketId: ticket._id,
        fromStatus,
        toStatus,
        changedBy: actor._id,
        timestamp: Date.now(),
        note: opt(String(args.note ?? "")),
      });
      logEvent(state, {
        sprintId: ticket.sprintId,
        eventType: toStatus === "blocked" ? "moved_to_blocked" : "status_changed",
        ticketId: ticket._id,
        actorId: actor._id,
        description:
          toStatus === "blocked"
            ? `Ticket: ${ticket.title} was moved to Blocked.`
            : `Ticket: ${ticket.title} moved from ${fromLabel} to ${toLabel}.`,
      });
      if (toStatus === "done") {
        logEvent(state, {
          sprintId: ticket.sprintId,
          eventType: "marked_complete",
          ticketId: ticket._id,
          actorId: actor._id,
          description: `Ticket: ${ticket.title} was marked as completed.`,
        });
      }
      mark("tickets", "statusHistory", "sprintEvents");
      return ticket._id;
    }
    case "tickets.update": {
      const actor = requireActor(state, String(args.actorId));
      const ticket = state.tickets.find((t) => t._id === args.ticketId);
      if (!ticket) throw new Error("Ticket not found");
      if (typeof args.title === "string") ticket.title = args.title.trim();
      if (typeof args.description === "string") {
        if (args.description.trim() !== ticket.description) {
          logEvent(state, {
            sprintId: ticket.sprintId,
            eventType: "description_edited",
            ticketId: ticket._id,
            actorId: actor._id,
            description: `The description for Ticket: ${ticket.title} was updated.`,
          });
        }
        ticket.description = args.description.trim();
      }
      if (args.assigneeId !== undefined) {
        const prev = ticket.assigneeId
          ? state.users.find((u) => u._id === ticket.assigneeId)?.name ?? "Unassigned"
          : "Unassigned";
        const nextId =
          args.assigneeId === null ? undefined : String(args.assigneeId);
        const nextName = nextId
          ? state.users.find((u) => u._id === nextId)?.name ?? "Unassigned"
          : "Unassigned";
        if (nextId !== ticket.assigneeId) {
          logEvent(state, {
            sprintId: ticket.sprintId,
            eventType: "assignee_changed",
            ticketId: ticket._id,
            actorId: actor._id,
            description: `Ticket: ${ticket.title} was reassigned from ${prev} to ${nextName}.`,
          });
        }
        ticket.assigneeId = nextId;
      }
      const dateKeys = [
        "plannedDevStart",
        "plannedDevEnd",
        "plannedTestingStart",
        "plannedTestingEnd",
        "actualDevStart",
        "actualDevEnd",
        "actualTestingStart",
        "actualTestingEnd",
      ] as const;
      for (const key of dateKeys) {
        if (args[key] !== undefined) {
          const value = args[key];
          ticket[key] = value === null ? undefined : String(value);
        }
      }
      if (args.sprintId !== undefined) {
        if (args.sprintId === null) {
          if (ticket.sprintId) {
            logEvent(state, {
              sprintId: ticket.sprintId,
              eventType: "removed_from_sprint",
              ticketId: ticket._id,
              actorId: actor._id,
              description: `Ticket: ${ticket.title} was removed from the sprint.`,
            });
          }
          ticket.sprintId = undefined;
        } else {
          const sprintId = String(args.sprintId);
          const sprint = state.sprints.find((s) => s._id === sprintId);
          if (!sprint) throw new Error("Sprint not found");
          if (sprint.teamId !== ticket.teamId) {
            throw new Error("That sprint belongs to a different team");
          }
          if (ticket.sprintId && ticket.sprintId !== sprint._id) {
            logEvent(state, {
              sprintId: ticket.sprintId,
              eventType: "removed_from_sprint",
              ticketId: ticket._id,
              actorId: actor._id,
              description: `Ticket: ${ticket.title} was removed from the sprint.`,
            });
          }
          if (ticket.sprintId !== sprint._id) {
            logEvent(state, {
              sprintId: sprint._id,
              eventType: "added_to_sprint",
              ticketId: ticket._id,
              actorId: actor._id,
              description: `Ticket: ${ticket.title} was added to ${sprint.name}.`,
            });
          }
          ticket.sprintId = sprint._id;
        }
      }
      if (typeof args.completed === "boolean") {
        ticket.completed = args.completed;
        if (args.completed) {
          logEvent(state, {
            sprintId: ticket.sprintId,
            eventType: "marked_complete",
            ticketId: ticket._id,
            actorId: actor._id,
            description: `Ticket: ${ticket.title} was marked as completed.`,
          });
        }
      }
      mark("tickets", "sprintEvents");
      return ticket._id;
    }
    case "tickets.remove": {
      requireActor(state, String(args.actorId));
      state.tickets = state.tickets.filter((t) => t._id !== args.ticketId);
      state.statusHistory = state.statusHistory.filter((h) => h.ticketId !== args.ticketId);
      state.sprintEvents = state.sprintEvents.filter((e) => e.ticketId !== args.ticketId);
      mark("tickets", "statusHistory", "sprintEvents");
      return null;
    }
    case "tickets.duplicate": {
      const actor = requireActor(state, String(args.actorId));
      const ticket = state.tickets.find((t) => t._id === args.ticketId);
      if (!ticket) throw new Error("Ticket not found");
      const copy: Ticket = {
        ...ticket,
        _id: newId("tkt"),
        ticketKey: nextTicketKey(state),
        status: "new",
        completed: false,
        sprintId: undefined,
        blockedFromStatus: undefined,
        statusChangedAt: Date.now(),
        createdAt: Date.now(),
        createdBy: actor._id,
      };
      state.tickets.push(copy);
      state.statusHistory.push({
        _id: newId("hist"),
        ticketId: copy._id,
        fromStatus: null,
        toStatus: "new",
        changedBy: actor._id,
        timestamp: Date.now(),
        note: `Duplicated from ${ticket.ticketKey}`,
      });
      mark("tickets", "statusHistory", "counters");
      return copy._id;
    }
    case "sprints.listByTeam": {
      requireActor(state, String(args.actorId));
      const teamId = args.teamId ? String(args.teamId) : "";
      const list = teamId
        ? state.sprints.filter((s) => s.teamId === teamId)
        : state.sprints;
      return [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
    case "sprints.create": {
      requireActor(state, String(args.actorId));
      const name = String(args.name ?? "").trim();
      if (!name) throw new Error("Sprint name is required");
      const makeActive = args.makeActive !== false;
      if (makeActive) {
        for (const sprint of state.sprints) {
          if (sprint.teamId === args.teamId && sprint.status === "active") {
            sprint.status = "planning";
          }
        }
      }
      const sprint: Sprint = {
        _id: newId("spr"),
        teamId: String(args.teamId),
        name,
        startDate: String(args.startDate),
        endDate: String(args.endDate),
        status: makeActive ? "active" : "planning",
        createdAt: Date.now(),
      };
      state.sprints.push(sprint);
      if (makeActive) {
        logEvent(state, {
          sprintId: sprint._id,
          eventType: "sprint_started",
          actorId: String(args.actorId),
          description: `${name} started with 0 work items.`,
        });
      }
      mark("sprints", "sprintEvents");
      return {
        _id: sprint._id,
        name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
      };
    }
    case "sprints.report": {
      requireActor(state, String(args.actorId));
      const sprint = state.sprints.find((s) => s._id === args.sprintId);
      if (!sprint) throw new Error("Sprint not found");
      const team = state.teams.find((t) => t._id === sprint.teamId);
      const tickets = state.tickets.filter((t) => t.sprintId === sprint._id);
      const rows = state.sprintEvents
        .filter((e) => e.sprintId === sprint._id)
        .sort((a, b) => a.timestamp - b.timestamp);
      const userName = (id: string) =>
        state.users.find((u) => u._id === id)?.name ?? "Unknown";
      const ticketById = new Map(state.tickets.map((t) => [t._id, t]));
      const firstOther = rows.find(
        (row) => row.eventType !== "sprint_started" && row.eventType !== "added_to_sprint",
      );
      const startRow = rows.find((row) => row.eventType === "sprint_started");
      const initialAddIds = new Set(
        startRow
          ? rows
              .filter(
                (row) =>
                  row.eventType === "added_to_sprint" &&
                  row.ticketId &&
                  (!firstOther || row.timestamp < firstOther.timestamp),
              )
              .map((row) => row._id)
          : [],
      );
      const events = [];
      for (const row of rows) {
        if (initialAddIds.has(row._id)) continue;
        if (row.eventType === "sprint_started") {
          const workItems = rows
            .filter((add) => initialAddIds.has(add._id) && add.ticketId)
            .map((add) => ticketById.get(add.ticketId!))
            .filter(Boolean)
            .map((ticket) => ({
              ticketId: ticket!._id,
              ticketKey: ticket!.ticketKey,
              title: ticket!.title,
            }));
          events.push({
            _id: row._id,
            eventType: row.eventType,
            timestamp: row.timestamp,
            actorName: userName(row.actorId),
            description: `${sprint.name} started with ${workItems.length} work items.`,
            workItems,
            completedBefore: 0,
            completedAfter: 0,
            scopeBefore: 0,
            scopeAfter: workItems.length,
          });
          continue;
        }
        const ticket = row.ticketId ? ticketById.get(row.ticketId) : undefined;
        events.push({
          _id: row._id,
          eventType: row.eventType,
          timestamp: row.timestamp,
          actorName: userName(row.actorId),
          description: row.description,
          workItems: ticket
            ? [{ ticketId: ticket._id, ticketKey: ticket.ticketKey, title: ticket.title }]
            : [],
          completedBefore: 0,
          completedAfter: 0,
          scopeBefore: 0,
          scopeAfter: 0,
        });
      }
      events.sort((a, b) => b.timestamp - a.timestamp);
      const total = tickets.length;
      const completed = tickets.filter((t) => t.status === "done" || t.completed).length;
      const inProgress = tickets.filter(
        (t) => t.status === "in_progress" || t.status === "testing",
      ).length;
      const blocked = tickets.filter((t) => t.status === "blocked").length;
      const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        teamName: team?.name ?? "Team",
        sprint,
        stats: {
          total,
          completed,
          inProgress,
          blocked,
          addedDuring: rows.filter((r) => r.eventType === "created_in_sprint" || (r.eventType === "added_to_sprint" && !initialAddIds.has(r._id))).length,
          removed: rows.filter((r) => r.eventType === "removed_from_sprint").length,
          progressPercent,
          health: blocked > 0 ? "at_risk" : progressPercent < 35 ? "watch" : "on_track",
        },
        events,
      };
    }
    case "seed.ensureDefaultTeams": {
      requireActor(state, String(args.actorId));
      dummyAssigneeSummaries(state, mark);
      if (state.teams.length > 0) return 0;
      for (const team of TEAM_SEED) {
        state.teams.push({
          _id: newId("team"),
          name: team.name,
          slug: team.slug,
          color: team.color,
          createdAt: Date.now(),
        });
      }
      mark("teams");
      return TEAM_SEED.length;
    }
    case "seed.loadDemo": {
      const actor = requireActor(state, String(args.actorId));
      const existingTitles = new Set(state.tickets.map((t) => t.title));
      if (state.teams.length === 0) {
        for (const team of TEAM_SEED) {
          state.teams.push({
            _id: newId("team"),
            name: team.name,
            slug: team.slug,
            color: team.color,
            createdAt: Date.now(),
          });
        }
      }
      const teamIds = new Map<string, string>();
      for (const team of state.teams) {
        teamIds.set(team.slug, team._id);
      }

      const ensureUser = (name: string): string => {
        const normalizedName = name.toLowerCase();
        const existing = state.users.find((u) => u.normalizedName === normalizedName);
        if (existing) return existing._id;
        const user: User = {
          _id: newId("usr"),
          name,
          normalizedName,
          createdAt: Date.now(),
        };
        state.users.push(user);
        return user._id;
      };

      const sprintIds = new Map<string, string>();
      for (const [slug, teamId] of teamIds.entries()) {
        const existingSprint = state.sprints.find(
          (s) => s.teamId === teamId && s.status === "active",
        );
        if (existingSprint) {
          sprintIds.set(slug, existingSprint._id);
          continue;
        }
        const sprint: Sprint = {
          _id: newId("spr"),
          teamId,
          name: "Sprint 14",
          startDate: "2026-09-01",
          endDate: "2026-09-12",
          status: "active",
          createdAt: Date.now(),
        };
        state.sprints.push(sprint);
        sprintIds.set(slug, sprint._id);
        logEvent(state, {
          sprintId: sprint._id,
          eventType: "sprint_started",
          actorId: actor._id,
          description: "Sprint 14 started with work items already in scope.",
          timestamp: Date.now() - 12 * 3_600_000,
        });
      }

      let ticketsCreated = 0;
      for (const seed of TICKET_SEED) {
        if (existingTitles.has(seed.title)) continue;
        const teamId = teamIds.get(seed.team);
        if (!teamId) continue;
        const ticketKey = nextTicketKey(state);
        const assigneeId = seed.assignee ? ensureUser(seed.assignee) : undefined;
        const createdAt = Date.now() - ticketsCreated * 3_600_000;
        const ticketId = newId("tkt");
        const sprintId = seed.sprint ? sprintIds.get(seed.team) : undefined;
        state.tickets.push({
          _id: ticketId,
          ticketKey,
          title: seed.title,
          description: seed.description,
          teamId,
          assigneeId,
          status: seed.status,
          blockedFromStatus: seed.status === "blocked" ? "testing" : undefined,
          sprintId,
          muted: false,
          completed: seed.status === "done",
          statusChangedAt: seed.status === "new" ? createdAt : createdAt + 1_800_000,
          plannedDevStart: seed.plannedDevStart,
          plannedDevEnd: seed.plannedDevEnd,
          createdAt,
          createdBy: actor._id,
        });
        state.statusHistory.push({
          _id: newId("hist"),
          ticketId,
          fromStatus: null,
          toStatus: "new",
          changedBy: actor._id,
          timestamp: createdAt,
          note: "Ticket created",
        });
        if (seed.status !== "new") {
          state.statusHistory.push({
            _id: newId("hist"),
            ticketId,
            fromStatus: "new",
            toStatus: seed.status,
            changedBy: actor._id,
            timestamp: createdAt + 1_800_000,
            note: "Seeded into current status",
          });
        }
        if (sprintId) {
          logEvent(state, {
            sprintId,
            eventType: "added_to_sprint",
            ticketId,
            actorId: actor._id,
            description: `Ticket: ${seed.title} was added to Sprint 14.`,
            timestamp: createdAt,
          });
          if (seed.status !== "new") {
            logEvent(state, {
              sprintId,
              eventType: seed.status === "blocked" ? "moved_to_blocked" : "status_changed",
              ticketId,
              actorId: actor._id,
              description:
                seed.status === "blocked"
                  ? `Ticket: ${seed.title} was moved to Blocked.`
                  : `Ticket: ${seed.title} moved from New to ${STATUS_LABELS[seed.status]}.`,
              oldValue: "New",
              newValue: STATUS_LABELS[seed.status],
              timestamp: createdAt + 1_800_000,
            });
          }
          if (seed.status === "done") {
            logEvent(state, {
              sprintId,
              eventType: "marked_complete",
              ticketId,
              actorId: actor._id,
              description: `Ticket: ${seed.title} was marked as completed.`,
              timestamp: createdAt + 1_800_000,
            });
          }
        }
        ticketsCreated += 1;
      }

      mark("teams", "sprints", "tickets", "statusHistory", "sprintEvents", "counters", "users");
      return { teamsCreated: teamIds.size, ticketsCreated };
    }
    case "progress.snapshot": {
      requireActor(state, String(args.actorId));
      const now = Number(args.now) || Date.now();
      const raw = args.teamId
        ? state.tickets.filter((t) => t.teamId === args.teamId)
        : state.tickets;
      const funnel = [...PIPELINE_STATUSES, "blocked", "rejected"].map((status) => ({
        status,
        count: raw.filter((t) => t.status === status).length,
      }));
      return { funnel, aging: [], stuck: [], shipping: [], throughput: [] };
    }
    case "health":
      return { ok: true };
    default:
      throw new Error(`Unknown operation: ${op}`);
  }
}
