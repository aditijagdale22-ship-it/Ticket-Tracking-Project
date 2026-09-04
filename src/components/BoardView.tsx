import { ALL_STATUSES, COLUMN_ACCENT, STATUS_META } from "../lib/status";
import type { Id } from "../data/ids";
import TicketCard from "./TicketCard";
import type { Ticket } from "../data/types";

type Props = {
  actorId: Id<"users">;
  tickets: Ticket[];
  onOpenTicket: (id: Id<"tickets">) => void;
};

export default function BoardView({ actorId, tickets, onOpenTicket }: Props) {
  return (
    <div className="mt-4 flex min-h-[280px] gap-3 overflow-x-auto pb-2">
      {ALL_STATUSES.map((status) => {
        const column = tickets.filter((ticket) => ticket.status === status);
        return (
          <div
            key={status}
            className={`flex w-64 shrink-0 flex-col rounded-2xl border border-rule border-t-4 bg-[#efebe3]/40 ${COLUMN_ACCENT[status]}`}
          >
            <div className="flex items-baseline justify-between px-3 pb-1 pt-3">
              <h4 className="text-sm font-semibold">
                {STATUS_META[status].label}
              </h4>
              <span className="font-mono text-xs text-ink-soft">
                {column.length}
              </span>
            </div>
            <p className="px-3 pb-2 text-[11px] leading-snug text-ink-soft">
              {STATUS_META[status].meaning}
            </p>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-3">
              {column.map((ticket) => (
                <TicketCard
                  key={ticket._id}
                  actorId={actorId}
                  ticket={ticket}
                  onOpen={() => onOpenTicket(ticket._id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
