import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "../data/hooks";
import { Archive, Copy, Trash2, X } from "lucide-react";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import { STATUS_META, STATUS_PILL, type TicketStatus } from "../lib/status";
import { formatDuration, formatTimestamp } from "../lib/format";
import { buildLifecycle } from "../lib/lifecycle";
import StatusDropdown from "./StatusDropdown";
import type { Ticket } from "../data/types";

type HistoryRow = {
  _id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedByName: string;
  timestamp: number;
  note?: string;
};

type Detail = {
  ticket: Ticket;
  history: HistoryRow[];
};

type Props = {
  actorId: Id<"users">;
  ticketId: Id<"tickets">;
  onClose: () => void;
  onOpenTicket: (id: Id<"tickets">) => void;
};

export default function TicketDetail({
  actorId,
  ticketId,
  onClose,
  onOpenTicket,
}: Props) {
  const detail = useQuery<Detail | null>(api.tickets.get, { actorId, ticketId });
  const people = useQuery<Array<{ _id: Id<"users">; name: string }>>(
    api.users.list,
    { actorId },
  );
  const teamId = detail?.ticket.teamId;
  const sprints = useQuery<
    Array<{ _id: Id<"sprints">; name: string; status: string }>
  >(
    api.sprints.listByTeam,
    teamId ? { actorId, teamId } : "skip",
  );

  const update = useMutation(api.tickets.update);
  const remove = useMutation(api.tickets.remove);
  const duplicate = useMutation(api.tickets.duplicate);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [completed, setCompleted] = useState(false);
  const [dates, setDates] = useState({
    plannedDevStart: "",
    plannedDevEnd: "",
    plannedTestingStart: "",
    plannedTestingEnd: "",
    actualDevStart: "",
    actualDevEnd: "",
    actualTestingStart: "",
    actualTestingEnd: "",
  });
  const hydratedTicket = useRef<string>("");

  useEffect(() => {
    hydratedTicket.current = "";
  }, [ticketId]);

  useEffect(() => {
    if (!detail || detail.ticket._id !== ticketId) return;
    if (hydratedTicket.current === ticketId) return;
    hydratedTicket.current = ticketId;
    const { ticket } = detail;
    setTitle(ticket.title);
    setDescription(ticket.description);
    setAssigneeId(ticket.assigneeId ?? "");
    setSprintId(ticket.sprintId ?? "");
    setCompleted(ticket.completed);
    setDates({
      plannedDevStart: ticket.plannedDevStart ?? "",
      plannedDevEnd: ticket.plannedDevEnd ?? "",
      plannedTestingStart: ticket.plannedTestingStart ?? "",
      plannedTestingEnd: ticket.plannedTestingEnd ?? "",
      actualDevStart: ticket.actualDevStart ?? "",
      actualDevEnd: ticket.actualDevEnd ?? "",
      actualTestingStart: ticket.actualTestingStart ?? "",
      actualTestingEnd: ticket.actualTestingEnd ?? "",
    });
  }, [detail, ticketId]);

  const timeline = useMemo(() => {
    if (!detail) return { segments: [], blocked: [] };
    return buildLifecycle(detail.history, Date.now());
  }, [detail]);

  if (detail === undefined) {
    return (
      <Drawer onClose={onClose}>
        <p className="p-6 text-ink-soft">Loading ticket…</p>
      </Drawer>
    );
  }

  if (detail === null) {
    return (
      <Drawer onClose={onClose}>
        <p className="p-6">Ticket not found.</p>
      </Drawer>
    );
  }

  const { ticket, history } = detail;
  const spanStart = timeline.segments[0]?.start ?? ticket.createdAt;
  const spanEnd = Date.now();
  const span = Math.max(1, spanEnd - spanStart);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await update({
        actorId,
        ticketId,
        title,
        description,
        assigneeId: assigneeId ? (assigneeId as Id<"users">) : null,
        sprintId: sprintId ? (sprintId as Id<"sprints">) : null,
        completed,
        plannedDevStart: dates.plannedDevStart || null,
        plannedDevEnd: dates.plannedDevEnd || null,
        plannedTestingStart: dates.plannedTestingStart || null,
        plannedTestingEnd: dates.plannedTestingEnd || null,
        actualDevStart: dates.actualDevStart || null,
        actualDevEnd: dates.actualDevEnd || null,
        actualTestingStart: dates.actualTestingStart || null,
        actualTestingEnd: dates.actualTestingEnd || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer onClose={onClose}>
      <form onSubmit={(e) => void handleSave(e)} className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-rule px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-ink-soft">{ticket.ticketKey}</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full bg-transparent font-display text-2xl leading-tight outline-none"
              required
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[ticket.status]}`}
              >
                {STATUS_META[ticket.status].label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ticket.team.color }}
                />
                {ticket.team.name}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Lifecycle
            </h4>
            <div className="relative mt-3 h-10 rounded-full bg-[#efebe3]">
              {timeline.segments.map((segment, index) => (
                <div
                  key={`${segment.status}-${index}`}
                  title={`${STATUS_META[segment.status].label}: ${formatDuration(segment.end - segment.start)}`}
                  className="absolute top-2 h-6 rounded-full bg-ember/70"
                  style={{
                    left: `${((segment.start - spanStart) / span) * 100}%`,
                    width: `${Math.max(2, ((segment.end - segment.start) / span) * 100)}%`,
                    opacity: 0.35 + index * 0.08,
                  }}
                />
              ))}
              {timeline.blocked.map((spanItem, index) => (
                <div
                  key={`blocked-${index}`}
                  title={`Blocked: ${formatDuration(spanItem.end - spanItem.start)}`}
                  className="absolute top-1 h-8 rounded-sm bg-red-500/70"
                  style={{
                    left: `${((spanItem.start - spanStart) / span) * 100}%`,
                    width: `${Math.max(1.5, ((spanItem.end - spanItem.start) / span) * 100)}%`,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-soft">
              {timeline.segments.map((segment, index) => (
                <span key={`${segment.status}-label-${index}`}>
                  {STATUS_META[segment.status].label}{" "}
                  {formatDuration(segment.end - segment.start)}
                </span>
              ))}
            </div>
          </section>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Description
            </span>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            />
          </label>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Status
            </h4>
            <div className="mt-2">
              <StatusDropdown actorId={actorId} ticket={ticket} />
            </div>
          </section>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
            />
            Completed
          </label>

          <section className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Assignee
              </span>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-rule px-2 py-1.5"
              >
                <option value="">Unassigned</option>
                {people?.map((person) => (
                  <option key={person._id} value={person._id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Sprint
              </span>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-rule px-2 py-1.5"
              >
                <option value="">Backlog</option>
                {sprints?.map((sprint) => (
                  <option key={sprint._id} value={sprint._id}>
                    {sprint.name} ({sprint.status})
                  </option>
                ))}
                {sprintId &&
                  sprints &&
                  !sprints.some((sprint) => sprint._id === sprintId) && (
                    <option value={sprintId}>Current sprint</option>
                  )}
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Planned & actual dates
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["plannedDevStart", "Planned dev start"],
                  ["plannedDevEnd", "Planned dev end"],
                  ["actualDevStart", "Actual dev start"],
                  ["actualDevEnd", "Actual dev end"],
                  ["plannedTestingStart", "Planned testing start"],
                  ["plannedTestingEnd", "Planned testing end"],
                  ["actualTestingStart", "Actual testing start"],
                  ["actualTestingEnd", "Actual testing end"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs">
                  <span className="text-ink-soft">{label}</span>
                  <input
                    type="date"
                    value={dates[key]}
                    onChange={(e) =>
                      setDates({ ...dates, [key]: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-rule px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </section>

          <p className="text-xs text-ink-soft">
            Created {formatTimestamp(ticket.createdAt)} by {ticket.createdByName}
          </p>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Status history
            </h4>
            <ol className="mt-3 space-y-3">
              {history.map((row) => (
                <li key={row._id} className="relative border-l border-rule pl-4">
                  <span className="absolute -left-1 top-1.5 h-2 w-2 rounded-full bg-ember" />
                  <p className="text-sm font-medium">
                    {row.fromStatus
                      ? `${STATUS_META[row.fromStatus].label} → ${STATUS_META[row.toStatus].label}`
                      : `Opened as ${STATUS_META[row.toStatus].label}`}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {row.changedByName} · {formatTimestamp(row.timestamp)}
                  </p>
                  {row.note && (
                    <p className="mt-1 rounded-lg bg-[#efebe3] px-2 py-1 text-sm">
                      {row.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <div className="flex flex-wrap gap-2 border-t border-rule pt-4">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember-hover disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save ticket"}
            </button>
            <Action
              icon={<Archive size={14} />}
              label="Move to backlog"
              onClick={async () => {
                setSprintId("");
                await update({ actorId, ticketId, sprintId: null });
              }}
            />
            <Action
              icon={<Copy size={14} />}
              label="Duplicate"
              onClick={async () => {
                const copyId = (await duplicate({
                  actorId,
                  ticketId,
                })) as Id<"tickets">;
                onOpenTicket(copyId);
              }}
            />
            <Action
              icon={<Trash2 size={14} />}
              label="Delete"
              danger
              onClick={async () => {
                if (
                  !window.confirm(
                    `Permanently delete ${ticket.ticketKey}? This cannot be undone.`,
                  )
                ) {
                  return;
                }
                await remove({ actorId, ticketId });
                onClose();
              }}
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
}

function Drawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="h-full flex-1 bg-ink/30"
        aria-label="Close ticket"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-rule bg-paper-raised shadow-2xl">
        {children}
      </aside>
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
        danger
          ? "border-red-200 text-red-800 hover:bg-red-50"
          : "border-rule hover:bg-paper"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
