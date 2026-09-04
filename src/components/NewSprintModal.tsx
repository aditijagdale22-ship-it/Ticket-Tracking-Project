import { FormEvent, useState } from "react";
import { useMutation } from "../data/hooks";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import { ModalShell } from "./NewTicketModal";

type Props = {
  actorId: Id<"users">;
  teamId: Id<"teams">;
  onClose: () => void;
};

export default function NewSprintModal({ actorId, teamId, onClose }: Props) {
  const create = useMutation(api.sprints.create);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [makeActive, setMakeActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await create({ actorId, teamId, name, startDate, endDate, makeActive });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create sprint");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="New sprint" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-rule px-3 py-2 font-normal"
            placeholder="Sprint 15"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Start
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-rule px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-medium">
            End
            <input
              required
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-rule px-3 py-2 font-normal"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={makeActive}
            onChange={(e) => setMakeActive(e.target.checked)}
          />
          Make this the active sprint
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white"
          >
            {busy ? "Saving…" : "Create sprint"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
