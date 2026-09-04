import { FormEvent, useState } from "react";
import { useMutation } from "../data/hooks";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import {
  allowedNextStatuses,
  STATUS_META,
  TicketStatus,
} from "../lib/status";
import type { Ticket } from "../data/types";

type Props = {
  actorId: Id<"users">;
  ticket: Ticket;
  compact?: boolean;
};

export default function StatusDropdown({ actorId, ticket, compact }: Props) {
  const changeStatus = useMutation(api.tickets.changeStatus);
  const [pending, setPending] = useState<TicketStatus | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const options = allowedNextStatuses(ticket.status);

  async function confirm(event?: FormEvent) {
    event?.preventDefault();
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await changeStatus({
        actorId,
        ticketId: ticket._id,
        toStatus: pending,
        note: note.trim() || undefined,
      });
      setPending(null);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <select
        aria-label="Change status"
        value={ticket.status}
        onChange={(e) => {
          const next = e.target.value as TicketStatus;
          if (next === ticket.status) return;
          setPending(next);
          setNote("");
          setError(null);
        }}
        className={`w-full rounded-lg border border-rule bg-white ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        <option value={ticket.status}>
          {STATUS_META[ticket.status].label}
        </option>
        {options.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>

      {pending && (
        <div className="absolute z-20 mt-2 w-72 rounded-xl border border-rule bg-paper-raised p-3 shadow-xl">
          <p className="text-sm font-semibold">
            {STATUS_META[ticket.status].label} → {STATUS_META[pending].label}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Optional note — why is this changing?
          </p>
          <form onSubmit={(e) => void confirm(e)} className="mt-2">
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-rule px-2 py-1.5 text-sm outline-none"
              placeholder="Blocked on API access, moving to QA…"
            />
            {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-white"
              >
                {busy ? "Saving…" : "Update"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setNote("");
                }}
                className="rounded-lg px-2.5 py-1 text-xs text-ink-soft"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
