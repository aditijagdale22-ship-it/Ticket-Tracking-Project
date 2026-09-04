import type { Id } from "../data/ids";
import { initials } from "../lib/format";
import StatusDropdown from "./StatusDropdown";
import type { Ticket } from "../data/types";

type Props = {
  actorId: Id<"users">;
  ticket: Ticket;
  onOpen: () => void;
};

export default function TicketCard({ actorId, ticket, onOpen }: Props) {
  return (
    <article className="rounded-xl border border-rule bg-paper-raised p-3 shadow-[0_1px_0_rgba(28,25,23,0.04)]">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <p className="font-mono text-[11px] text-ink-soft">{ticket.ticketKey}</p>
        <h5 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
          {ticket.title}
        </h5>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold"
            title={ticket.assignee?.name ?? "Unassigned"}
          >
            {ticket.assignee ? initials(ticket.assignee.name) : "—"}
          </span>
          <span className="truncate text-[11px] text-ink-soft">
            {ticket.assignee?.name ?? "Unassigned"}
          </span>
        </div>
      </div>
      <div className="mt-2">
        <StatusDropdown actorId={actorId} ticket={ticket} compact />
      </div>
    </article>
  );
}
