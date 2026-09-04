import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "../data/hooks";
import { MoreHorizontal } from "lucide-react";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import { STATUS_META, STATUS_PILL } from "../lib/status";
import { formatRange } from "../lib/format";
import type { Ticket } from "../data/types";

type SortKey =
  | "ticketKey"
  | "title"
  | "status"
  | "assignee"
  | "team"
  | "sprint"
  | "plannedDev"
  | "actualDev"
  | "createdAt";

type Props = {
  actorId: Id<"users">;
  tickets: Ticket[];
  showTeam: boolean;
  onOpenTicket: (id: Id<"tickets">) => void;
};

export default function SheetView({
  actorId,
  tickets,
  showTeam,
  onOpenTicket,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...tickets];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [tickets, sortKey, dir]);

  function toggle(key: SortKey) {
    if (sortKey === key) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir(key === "createdAt" ? "desc" : "asc");
    }
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-paper-raised">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-[#efebe3] text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <Th onClick={() => toggle("ticketKey")} label="ID" />
            <Th onClick={() => toggle("title")} label="Title" />
            <Th onClick={() => toggle("status")} label="Status" />
            <Th onClick={() => toggle("assignee")} label="Assignee" />
            {showTeam && <Th onClick={() => toggle("team")} label="Team" />}
            <Th onClick={() => toggle("sprint")} label="Sprint" />
            <Th onClick={() => toggle("plannedDev")} label="Planned dev" />
            <Th onClick={() => toggle("actualDev")} label="Actual dev" />
            <th className="px-3 py-2 font-medium">Planned QA</th>
            <th className="px-3 py-2 font-medium">Actual QA</th>
            <th className="px-3 py-2 font-medium"> </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ticket) => (
            <tr
              key={ticket._id}
              className="cursor-pointer border-t border-rule hover:bg-amber-50/40"
              onClick={() => onOpenTicket(ticket._id)}
            >
              <td className="px-3 py-2 font-mono text-xs text-ink-soft">
                {ticket.ticketKey}
              </td>
              <td className="px-3 py-2 font-medium">{ticket.title}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_PILL[ticket.status]}`}
                >
                  {STATUS_META[ticket.status].label}
                </span>
              </td>
              <td className="px-3 py-2 text-ink-soft">
                {ticket.assignee?.name ?? "Unassigned"}
              </td>
              {showTeam && (
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: ticket.team.color }}
                    />
                    {ticket.team.name}
                  </span>
                </td>
              )}
              <td className="px-3 py-2 text-ink-soft">
                {ticket.sprint?.name ?? "Backlog"}
              </td>
              <td className="px-3 py-2 text-ink-soft">
                {formatRange(ticket.plannedDevStart, ticket.plannedDevEnd)}
              </td>
              <td className="px-3 py-2 text-ink-soft">
                {formatRange(ticket.actualDevStart, ticket.actualDevEnd)}
              </td>
              <td className="px-3 py-2 text-ink-soft">
                {formatRange(
                  ticket.plannedTestingStart,
                  ticket.plannedTestingEnd,
                )}
              </td>
              <td className="px-3 py-2 text-ink-soft">
                {formatRange(
                  ticket.actualTestingStart,
                  ticket.actualTestingEnd,
                )}
              </td>
              <td
                className="px-3 py-2 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <RowMenu
                  actorId={actorId}
                  ticket={ticket}
                  onEdit={() => onOpenTicket(ticket._id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowMenu({
  actorId,
  ticket,
  onEdit,
}: {
  actorId: Id<"users">;
  ticket: Ticket;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const remove = useMutation(api.tickets.remove);
  const duplicate = useMutation(api.tickets.duplicate);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-label="Ticket actions"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg p-1 hover:bg-stone-100"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 rounded-xl border border-rule bg-paper-raised py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-paper"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-paper"
            onClick={async () => {
              setOpen(false);
              await duplicate({ actorId, ticketId: ticket._id });
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm text-red-800 hover:bg-red-50"
            onClick={async () => {
              if (
                !window.confirm(
                  `Permanently delete ${ticket.ticketKey}? This cannot be undone.`,
                )
              ) {
                return;
              }
              setOpen(false);
              await remove({ actorId, ticketId: ticket._id });
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Th({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-3 py-2">
      <button type="button" onClick={onClick} className="font-medium hover:text-ink">
        {label}
      </button>
    </th>
  );
}

function sortValue(ticket: Ticket, key: SortKey): string | number {
  switch (key) {
    case "ticketKey":
      return ticket.ticketKey;
    case "title":
      return ticket.title.toLowerCase();
    case "status":
      return ticket.status;
    case "assignee":
      return ticket.assignee?.name.toLowerCase() ?? "";
    case "team":
      return ticket.team.name.toLowerCase();
    case "sprint":
      return ticket.sprint?.name.toLowerCase() ?? "";
    case "plannedDev":
      return ticket.plannedDevStart ?? "";
    case "actualDev":
      return ticket.actualDevStart ?? "";
    case "createdAt":
      return ticket.createdAt;
  }
}
