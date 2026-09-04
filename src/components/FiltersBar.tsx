import { ALL_STATUSES, STATUS_META, TicketStatus } from "../lib/status";
import type { Id } from "../data/ids";

export type Filters = {
  assigneeId: string;
  status: string;
  teamId: string;
  sprintScope: "all" | "sprint" | "backlog";
  query: string;
};

type Person = { _id: Id<"users">; name: string };
type Team = { _id: Id<"teams">; name: string; color: string };

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  people: Person[];
  teams: Team[];
  showTeamFilter: boolean;
  showSprintFilter?: boolean;
};

export default function FiltersBar({
  filters,
  onChange,
  people,
  teams,
  showTeamFilter,
  showSprintFilter = true,
}: Props) {
  function patch(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-[#efebe3]/60 px-6 py-3">
      <input
        value={filters.query}
        onChange={(e) => patch({ query: e.target.value })}
        placeholder="Find a ticket by title or ID"
        className="min-w-[220px] flex-1 rounded-lg border border-rule bg-white px-3 py-1.5 text-sm outline-none ring-ember/20 focus:ring-2"
      />
      <select
        value={filters.assigneeId}
        onChange={(e) => patch({ assigneeId: e.target.value })}
        className="rounded-lg border border-rule bg-white px-2 py-1.5 text-sm"
      >
        <option value="">All assignees</option>
        {people.map((person) => (
          <option key={person._id} value={person._id}>
            {person.name}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(e) => patch({ status: e.target.value })}
        className="rounded-lg border border-rule bg-white px-2 py-1.5 text-sm"
      >
        <option value="">All statuses</option>
        {ALL_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status as TicketStatus].label}
          </option>
        ))}
      </select>
      {showTeamFilter && (
        <select
          value={filters.teamId}
          onChange={(e) => patch({ teamId: e.target.value })}
          className="rounded-lg border border-rule bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name}
            </option>
          ))}
        </select>
      )}
      {showSprintFilter && (
      <select
        value={filters.sprintScope}
        onChange={(e) =>
          patch({ sprintScope: e.target.value as Filters["sprintScope"] })
        }
        className="rounded-lg border border-rule bg-white px-2 py-1.5 text-sm"
      >
        <option value="all">Sprint + backlog</option>
        <option value="sprint">Sprint only</option>
        <option value="backlog">Backlog only</option>
      </select>
      )}
    </div>
  );
}
