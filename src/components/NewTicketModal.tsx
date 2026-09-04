import { FormEvent, type ReactNode, useState } from "react";
import { useMutation, useQuery } from "../data/hooks";
import { X } from "lucide-react";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import {
  ALL_STATUSES,
  STATUS_META,
  STATUS_PILL,
  TicketStatus,
} from "../lib/status";

type Props = {
  actorId: Id<"users">;
  defaultTeamId: Id<"teams"> | null;
  onClose: () => void;
  onCreated: (id: Id<"tickets">) => void;
};

export default function NewTicketModal({
  actorId,
  defaultTeamId,
  onClose,
  onCreated,
}: Props) {
  const teams = useQuery<Array<{ _id: Id<"teams">; name: string }>>(
    api.teams.list,
    { actorId },
  );
  const people = useQuery<Array<{ _id: Id<"users">; name: string }>>(
    api.users.list,
    { actorId },
  );
  const create = useMutation(api.tickets.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState(defaultTeamId ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [status, setStatus] = useState<TicketStatus>("new");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sprints = useQuery<
    Array<{ _id: Id<"sprints">; name: string; status: string }>
  >(
    api.sprints.listByTeam,
    teamId ? { actorId, teamId: teamId as Id<"teams"> } : "skip",
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!teamId) {
      setError("Team is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = (await create({
        actorId,
        title,
        description,
        teamId: teamId as Id<"teams">,
        assigneeId: assigneeId ? (assigneeId as Id<"users">) : undefined,
        sprintId: sprintId ? (sprintId as Id<"sprints">) : undefined,
        status,
      })) as Id<"tickets">;
      onCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="New ticket" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" htmlFor="ticket-title">
          <input
            id="ticket-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-rule px-3 py-2"
            placeholder="What needs to happen?"
          />
        </Field>
        <Field label="Description" htmlFor="ticket-desc">
          <textarea
            id="ticket-desc"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-rule px-3 py-2"
            placeholder="Context, links, and what done looks like."
          />
        </Field>
        <Field label="Team" htmlFor="ticket-team">
          <select
            id="ticket-team"
            required
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setSprintId("");
            }}
            className="w-full rounded-xl border border-rule px-3 py-2"
          >
            <option value="">Select a team</option>
            {teams?.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assignee (optional)" htmlFor="ticket-assignee">
          <select
            id="ticket-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full rounded-xl border border-rule px-3 py-2"
          >
            <option value="">Unassigned</option>
            {people?.map((person) => (
              <option key={person._id} value={person._id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sprint (optional)" htmlFor="ticket-sprint">
          <select
            id="ticket-sprint"
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="w-full rounded-xl border border-rule px-3 py-2"
          >
            <option value="">Backlog — not in a sprint</option>
            {sprints?.map((sprint) => (
              <option key={sprint._id} value={sprint._id}>
                {sprint.name} ({sprint.status})
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-1 text-sm font-medium">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((item) => {
              const selected = status === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${
                    STATUS_PILL[item]
                  } ${selected ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100"}`}
                >
                  {STATUS_META[item].label}
                </button>
              );
            })}
          </div>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember-hover"
          >
            {busy ? "Saving…" : "Save ticket"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-ink/40 p-4 pt-16">
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-3xl border border-rule bg-paper-raised p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-display text-2xl">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
