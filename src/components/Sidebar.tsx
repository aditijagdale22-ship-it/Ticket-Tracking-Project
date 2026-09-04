import { FormEvent, useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery } from "../data/hooks";
import { LayoutGrid, LogOut, Plus } from "lucide-react";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import { initials } from "../lib/format";

type Props = {
  actorId: Id<"users">;
  actorName: string;
  onSignOut: () => void;
};

export default function Sidebar({ actorId, actorName, onSignOut }: Props) {
  const teams = useQuery<
    Array<{ _id: Id<"teams">; name: string; color: string }>
  >(api.teams.list, { actorId });
  const [creating, setCreating] = useState(false);

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-ink text-[#f5efe6]">
      <div className="px-5 pb-4 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300/80">
          Shared tickets
        </p>
        <h1 className="mt-1 font-display text-2xl leading-tight">Event Board</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <LayoutGrid size={16} />
          All teams
        </NavLink>

        <div className="flex items-center justify-between px-3 pb-1 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Teams
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded p-0.5 text-white/50 hover:text-white"
            aria-label="Create team"
          >
            <Plus size={14} />
          </button>
        </div>

        {teams === undefined && (
          <p className="px-3 text-sm text-white/40">Loading teams…</p>
        )}
        {teams?.map((team) => (
          <NavLink
            key={team._id}
            to={`/t/${team._id}`}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: team.color }}
            />
            {team.name}
          </NavLink>
        ))}

        {creating && (
          <NewTeamForm
            actorId={actorId}
            onClose={() => setCreating(false)}
          />
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-400/20 font-mono text-xs text-orange-200">
            {initials(actorName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{actorName}</p>
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1 text-xs text-white/45 hover:text-white"
            >
              <LogOut size={11} />
              Switch person
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NewTeamForm({
  actorId,
  onClose,
}: {
  actorId: Id<"users">;
  onClose: () => void;
}) {
  const create = useMutation(api.teams.create);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await create({ actorId, name });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create team");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg bg-white/5 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Team name"
        className="w-full rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-sm text-white outline-none placeholder:text-white/40"
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-orange-500 px-2 py-1 text-xs font-semibold text-white"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-white/60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
