import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "../data/hooks";
import { FileBarChart, Columns3, Plus, Rows3, Sparkles } from "lucide-react";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import type { Ticket } from "../data/types";
import FiltersBar, { Filters } from "./FiltersBar";
import BoardView from "./BoardView";
import SheetView from "./SheetView";
import SprintReport from "./SprintReport";
import NewSprintModal from "./NewSprintModal";

type Sprint = {
  _id: Id<"sprints">;
  teamId: Id<"teams">;
  name: string;
  startDate: string;
  endDate: string;
  status: "planning" | "active" | "completed";
};

type Props = {
  actorId: Id<"users">;
  teamId: Id<"teams"> | null;
  onNewTicket: () => void;
  onOpenTicket: (id: Id<"tickets">) => void;
  onOpenSprint: (id: Id<"sprints">) => void;
};

export default function Workspace({
  actorId,
  teamId,
  onNewTicket,
  onOpenTicket,
  onOpenSprint,
}: Props) {
  const [view, setView] = useState<"board" | "sheet" | "report">("board");
  const [filters, setFilters] = useState<Filters>({
    assigneeId: "",
    status: "",
    teamId: "",
    sprintScope: "all",
    query: "",
  });
  const [page, setPage] = useState(0);
  const [sprintModal, setSprintModal] = useState(false);
  const [reportSprintId, setReportSprintId] = useState<Id<"sprints"> | null>(
    null,
  );

  const teams = useQuery<Array<{ _id: Id<"teams">; name: string; color: string }>>(
    api.teams.list,
    { actorId },
  );
  const people = useQuery<Array<{ _id: Id<"users">; name: string }>>(
    api.users.list,
    { actorId },
  );
  const tickets = useQuery<Ticket[]>(api.tickets.list, {
    actorId,
    teamId: teamId ?? undefined,
  });
  const sprints = useQuery<Sprint[]>(api.sprints.listByTeam, {
    actorId,
    teamId: teamId ?? undefined,
  });
  const loadDemo = useMutation(api.seed.loadDemo);

  const currentTeam = teams?.find((team) => team._id === teamId) ?? null;
  const isTeamView = Boolean(teamId);

  useEffect(() => {
    if (!isTeamView && view === "report") {
      setView("board");
    }
  }, [isTeamView, view]);

  useEffect(() => {
    setPage(0);
  }, [filters, teamId, view]);

  const filtered = useMemo(() => {
    if (!tickets) return undefined;
    const q = filters.query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filters.assigneeId && ticket.assigneeId !== filters.assigneeId) {
        return false;
      }
      if (filters.status && ticket.status !== filters.status) {
        return false;
      }
      if (filters.teamId && ticket.teamId !== filters.teamId) {
        return false;
      }
      if (filters.sprintScope === "sprint" && ticket.inBacklog) {
        return false;
      }
      if (filters.sprintScope === "backlog" && !ticket.inBacklog) {
        return false;
      }
      if (q) {
        const hay = `${ticket.ticketKey} ${ticket.title} ${ticket.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, filters]);

  const activeSprints = useMemo(() => {
    if (!sprints) return [];
    const relevant = teamId
      ? sprints.filter((sprint) => sprint.teamId === teamId)
      : sprints;
    return relevant.filter((sprint) => sprint.status === "active");
  }, [sprints, teamId]);

  const sprintTickets = filtered?.filter((ticket) => !ticket.inBacklog) ?? [];
  const backlogTickets = filtered?.filter((ticket) => ticket.inBacklog) ?? [];
  const allTickets = filtered ?? [];
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(allTickets.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedTickets = allTickets.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize,
  );
  const selectedSprintId =
    reportSprintId ?? activeSprints[0]?._id ?? sprints?.[0]?._id ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-rule px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            {currentTeam ? "Team workspace" : "All-teams rollup"}
          </p>
          <h2 className="mt-1 font-display text-3xl">
            {currentTeam?.name ?? "Every team"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-rule bg-white p-1">
            <Toggle
              active={view === "board"}
              onClick={() => setView("board")}
              icon={<Columns3 size={15} />}
              label="Board"
            />
            <Toggle
              active={view === "sheet"}
              onClick={() => setView("sheet")}
              icon={<Rows3 size={15} />}
              label="Sheet"
            />
            {isTeamView && (
            <Toggle
              active={view === "report"}
              onClick={() => setView("report")}
              icon={<FileBarChart size={15} />}
              label="Report"
            />
            )}
          </div>
          {teamId && (
            <button
              type="button"
              onClick={() => setSprintModal(true)}
              className="rounded-xl border border-rule bg-white px-3 py-2 text-sm font-medium hover:bg-paper"
            >
              New sprint
            </button>
          )}
          <button
            type="button"
            onClick={onNewTicket}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ember px-3 py-2 text-sm font-semibold text-white hover:bg-ember-hover"
          >
            <Plus size={15} />
            New ticket
          </button>
        </div>
      </header>

      {view !== "report" && (
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        people={people ?? []}
        teams={teams ?? []}
        showTeamFilter={!isTeamView}
        showSprintFilter={isTeamView}
      />
      )}

      <div className={`min-h-0 flex-1 ${view === "report" ? "overflow-hidden" : "overflow-auto px-6 py-5"}`}>
        {view === "report" && isTeamView ? (
          selectedSprintId ? (
            <SprintReport
              actorId={actorId}
              sprintId={selectedSprintId}
              onOpenTicket={onOpenTicket}
              onSelectSprint={setReportSprintId}
              embedded
            />
          ) : (
            <p className="p-6 text-ink-soft">
              Create a sprint to open the report.
            </p>
          )
        ) : filtered === undefined ? (
          <p className="text-ink-soft">Loading tickets…</p>
        ) : tickets && tickets.length === 0 ? (
          <EmptyWorkspace
            onNewTicket={onNewTicket}
            onLoadDemo={async () => {
              await loadDemo({ actorId });
            }}
          />
        ) : (
          <div className="space-y-10">
            {isTeamView ? (
              <>
            <section>
              <SprintHeading
                sprints={activeSprints}
                onOpenSprint={onOpenSprint}
              />
              {sprintTickets.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-rule px-4 py-8 text-sm text-ink-soft">
                  No tickets in the active sprint. Pull from the backlog or create
                  a sprint to start planning.
                </p>
              ) : view === "board" ? (
                <BoardView
                  actorId={actorId}
                  tickets={sprintTickets}
                  onOpenTicket={onOpenTicket}
                />
              ) : (
                <SheetView
                  actorId={actorId}
                  tickets={sprintTickets}
                  showTeam={false}
                  onOpenTicket={onOpenTicket}
                />
              )}
            </section>

            <section>
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="font-display text-xl">Backlog</h3>
                  <p className="text-sm text-ink-soft">
                    Not in a sprint · {backlogTickets.length} ticket
                    {backlogTickets.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {backlogTickets.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-rule px-4 py-8 text-sm text-ink-soft">
                  Backlog is empty for this view.
                </p>
              ) : view === "board" ? (
                <BoardView
                  actorId={actorId}
                  tickets={backlogTickets}
                  onOpenTicket={onOpenTicket}
                />
              ) : (
                <SheetView
                  actorId={actorId}
                  tickets={backlogTickets}
                  showTeam={false}
                  onOpenTicket={onOpenTicket}
                />
              )}
            </section>
              </>
            ) : (
              <section>
                <div>
                  <h3 className="font-display text-xl">All tickets</h3>
                  <p className="text-sm text-ink-soft">
                    {allTickets.length} ticket
                    {allTickets.length === 1 ? "" : "s"} across every team
                  </p>
                </div>
                {allTickets.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-rule px-4 py-8 text-sm text-ink-soft">
                    No tickets match these filters.
                  </p>
                ) : view === "board" ? (
                  <BoardView
                    actorId={actorId}
                    tickets={pagedTickets}
                    onOpenTicket={onOpenTicket}
                  />
                ) : (
                  <SheetView
                    actorId={actorId}
                    tickets={pagedTickets}
                    showTeam
                    onOpenTicket={onOpenTicket}
                  />
                )}
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={allTickets.length}
                  pageSize={pageSize}
                  onPage={setPage}
                />
              </section>
            )}
          </div>
        )}
      </div>

      {sprintModal && teamId && (
        <NewSprintModal
          actorId={actorId}
          teamId={teamId}
          onClose={() => setSprintModal(false)}
        />
      )}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
        active ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SprintHeading({
  sprints,
  onOpenSprint,
}: {
  sprints: Sprint[];
  onOpenSprint: (id: Id<"sprints">) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-xl">Event Board</h3>
      {sprints.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {sprints.map((sprint) => (
            <button
              key={sprint._id}
              type="button"
              onClick={() => onOpenSprint(sprint._id)}
              className="rounded-full border border-rule bg-white px-3 py-1 text-sm hover:bg-paper"
            >
              {sprint.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyWorkspace({
  onNewTicket,
  onLoadDemo,
}: {
  onNewTicket: () => void;
  onLoadDemo: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-rule bg-paper-raised p-8 text-center">
      <Sparkles className="mx-auto text-ember" />
      <h3 className="mt-3 font-display text-2xl">Nothing on the board yet</h3>
      <p className="mt-2 text-sm text-ink-soft">
        Create the first ticket, or load a demo workspace with sample teams,
        sprints, and statuses.
      </p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={onNewTicket}
          className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember-hover"
        >
          New ticket
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onLoadDemo();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not load demo");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-xl border border-rule bg-white px-4 py-2 text-sm font-medium"
        >
          {busy ? "Loading…" : "Load demo data"}
        </button>
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) {
    return null;
  }
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
      <p>
        Showing {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-rule bg-white px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="px-1 py-1.5">
          Page {page + 1} of {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-rule bg-white px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export type { Ticket };

