import { useMemo, useState } from "react";
import { useQuery } from "../data/hooks";
import { Link, useNavigate } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import { formatEventStamp, formatLongDate } from "../lib/format";

type Props = {
  actorId: Id<"users">;
  sprintId: Id<"sprints">;
  onOpenTicket: (id: Id<"tickets">) => void;
  onSelectSprint?: (id: Id<"sprints">) => void;
  embedded?: boolean;
};

const EVENT_LABEL: Record<string, string> = {
  sprint_started: "Sprint started",
  status_changed: "Status changed",
  assignee_changed: "Assignee changed",
  description_edited: "Description updated",
  added_to_sprint: "Added to sprint",
  removed_from_sprint: "Removed from sprint",
  created_in_sprint: "Work item created",
  moved_to_blocked: "Moved to Blocked",
  due_date_changed: "Due date changed",
  marked_complete: "Work item completed",
};

const HEALTH_COPY = {
  on_track: { label: "On track", className: "bg-emerald-100 text-emerald-900" },
  watch: { label: "Watch", className: "bg-amber-100 text-amber-950" },
  at_risk: { label: "At risk", className: "bg-red-100 text-red-900" },
};

export default function SprintReport({
  actorId,
  sprintId,
  onOpenTicket,
  onSelectSprint,
  embedded,
}: Props) {
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());
  const sprints = useQuery<
    Array<{ _id: Id<"sprints">; teamId: Id<"teams">; name: string }>
  >(api.sprints.listByTeam, { actorId });
  const report = useQuery<{
    teamName: string;
    sprint: {
      _id: Id<"sprints">;
      teamId: Id<"teams">;
      name: string;
      startDate: string;
      endDate: string;
    };
    stats: {
      total: number;
      completed: number;
      inProgress: number;
      blocked: number;
      addedDuring: number;
      removed: number;
      progressPercent: number;
      health: "on_track" | "watch" | "at_risk";
    };
    events: Array<{
      _id: string;
      eventType: string;
      timestamp: number;
      description: string;
      workItems: Array<{
        ticketId: Id<"tickets">;
        ticketKey: string;
        title: string;
      }>;
    }>;
  }>(api.sprints.report, { actorId, sprintId, now });

  const teamSprints = useMemo(() => {
    if (!sprints || !report) return [];
    return sprints.filter((item) => item.teamId === report.sprint.teamId);
  }, [sprints, report]);

  function selectSprint(id: string) {
    const next = id as Id<"sprints">;
    if (onSelectSprint) {
      onSelectSprint(next);
      return;
    }
    navigate(`/sprint/${next}`);
  }

  if (!report) {
    return <p className="p-6 text-ink-soft">Loading sprint report…</p>;
  }

  const { sprint, teamName, stats, events } = report;
  const health = HEALTH_COPY[stats.health];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f4f5f7]">
      <header className="border-b border-stone-200 bg-white px-6 py-5">
        <p className="text-xs text-stone-500">
          Spaces / {teamName} / Reports
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl">Sprint report</h2>
          {!embedded && (
            <Link to="/" className="text-sm text-stone-500 hover:text-ink">
              How to read this report
            </Link>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-stone-500">
              Sprint
            </span>
            <select
              value={sprintId}
              onChange={(e) => selectSprint(e.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {teamSprints.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ml-auto rounded-md border border-stone-300 p-2 text-stone-500"
            aria-label="Report options"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Date - {formatLongDate(sprint.startDate)} - {formatLongDate(sprint.endDate)}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Sprint health"
            value={health.label}
            hint={`${stats.progressPercent}% complete`}
            pillClass={health.className}
          />
          <StatCard
            label="Work items"
            value={String(stats.total)}
            hint={`${stats.completed} completed · ${stats.inProgress} in progress`}
          />
          <StatCard
            label="Blocked"
            value={String(stats.blocked)}
            hint={
              stats.blocked > 0
                ? "Needs attention before the sprint can land"
                : "No blocked work"
            }
          />
          <StatCard
            label="Scope changes"
            value={`${stats.addedDuring} / ${stats.removed}`}
            hint="Added during sprint / removed"
          />
        </section>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-2 rounded-full bg-ember"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-[#f4f5f7] text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Work item</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-stone-500">
                    No events logged for this sprint yet. Status, assignee, and
                    sprint membership changes will show up here.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event._id} className="border-t border-stone-200 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-stone-500">
                      {formatEventStamp(event.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {EVENT_LABEL[event.eventType] ?? event.eventType}
                      </p>
                      <p className="mt-0.5 max-w-sm text-xs text-stone-500">
                        {event.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {event.workItems.length === 0 ? (
                        <span className="text-stone-400">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {event.workItems.map((item) => (
                            <li key={item.ticketId}>
                              <button
                                type="button"
                                onClick={() => onOpenTicket(item.ticketId)}
                                className="text-left"
                              >
                                <span className="font-mono text-xs font-medium text-violet-700 hover:underline">
                                  {item.ticketKey}
                                </span>
                                <span className="ml-2 text-stone-800">
                                  {item.title}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  pillClass,
}: {
  label: string;
  value: string;
  hint: string;
  pillClass?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      {pillClass ? (
        <span
          className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold ${pillClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      )}
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </div>
  );
}
