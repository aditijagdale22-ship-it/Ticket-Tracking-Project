import { useState } from "react";
import { useQuery } from "../data/hooks";
import { api } from "../data/api";
import type { Id } from "../data/ids";
import { STATUS_META, STATUS_PILL, TicketStatus } from "../lib/status";
import { formatDuration } from "../lib/format";

type Props = {
  actorId: Id<"users">;
  teamId: Id<"teams"> | null;
  onOpenTicket: (id: Id<"tickets">) => void;
};

export default function ProgressView({ actorId, teamId, onOpenTicket }: Props) {
  const [stuckDays, setStuckDays] = useState(10);
  const [now] = useState(() => Date.now());
  const snapshot = useQuery<{
    funnel: Array<{ status: string; count: number }>;
    aging: Array<{
      ticketId: Id<"tickets">;
      ticketKey: string;
      title: string;
      status: string;
      ageMs: number;
      stageMs: number;
    }>;
    stuck: Array<{
      ticketId: Id<"tickets">;
      ticketKey: string;
      title: string;
      status: string;
      stageMs: number;
    }>;
    shipping: Array<{
      ticketId: Id<"tickets">;
      ticketKey: string;
      title: string;
      testingStart?: string;
    }>;
    throughput: Array<{ week: string; completed: number; avgCycleMs: number }>;
  }>(api.progress.snapshot, {
    actorId,
    teamId: teamId ?? undefined,
    stuckDays,
    now,
  });

  if (!snapshot) {
    return <p className="text-ink-soft">Loading pipeline health…</p>;
  }

  const maxFunnel = Math.max(1, ...snapshot.funnel.map((row) => row.count));

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-display text-xl">Stage-wise counts</h3>
        <p className="text-sm text-ink-soft">
          Where the pipeline is holding work right now.
        </p>
        <div className="mt-4 space-y-2">
          {snapshot.funnel.map((row) => {
            const meta = STATUS_META[row.status as TicketStatus];
            return (
              <div key={row.status} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm">{meta?.label ?? row.status}</span>
                <div className="h-6 flex-1 rounded-full bg-[#efebe3]">
                  <div
                    className="h-6 rounded-full bg-ember/80"
                    style={{ width: `${(row.count / maxFunnel) * 100}%` }}
                  />
                </div>
                <span className="w-8 font-mono text-sm">{row.count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl">Stuck</h3>
            <p className="text-sm text-ink-soft">
              Open tickets sitting in one stage longer than the threshold.
            </p>
          </div>
          <label className="text-sm text-ink-soft">
            Threshold (days)
            <input
              type="number"
              min={1}
              value={stuckDays}
              onChange={(e) => setStuckDays(Number(e.target.value) || 1)}
              className="ml-2 w-16 rounded-lg border border-rule px-2 py-1"
            />
          </label>
        </div>
        <TicketTable
          rows={snapshot.stuck.map((row) => ({
            ...row,
            extra: formatDuration(row.stageMs) + " in stage",
          }))}
          onOpenTicket={onOpenTicket}
          empty="Nothing is over the stuck threshold."
        />
      </section>

      <section>
        <h3 className="font-display text-xl">Aging</h3>
        <p className="text-sm text-ink-soft">
          Open tickets by time in the current stage, then total age.
        </p>
        <TicketTable
          rows={snapshot.aging.map((row) => ({
            ...row,
            extra: `${formatDuration(row.stageMs)} in stage · ${formatDuration(row.ageMs)} old`,
          }))}
          onOpenTicket={onOpenTicket}
          empty="No open tickets."
        />
      </section>

      <section>
        <h3 className="font-display text-xl">Closest to shipping</h3>
        <p className="text-sm text-ink-soft">Tickets currently in Testing.</p>
        <TicketTable
          rows={snapshot.shipping.map((row) => ({
            ticketId: row.ticketId,
            ticketKey: row.ticketKey,
            title: row.title,
            status: "testing",
            extra: row.testingStart
              ? `Testing started ${row.testingStart}`
              : "No testing start date",
          }))}
          onOpenTicket={onOpenTicket}
          empty="Nothing in Testing."
        />
      </section>

      <section>
        <h3 className="font-display text-xl">Throughput trend</h3>
        <p className="text-sm text-ink-soft">
          Tickets completed per week and average cycle time (New → Done).
        </p>
        {snapshot.throughput.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-rule px-4 py-8 text-sm text-ink-soft">
            No completed tickets yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-paper-raised">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#efebe3] text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Week</th>
                  <th className="px-3 py-2">Completed</th>
                  <th className="px-3 py-2">Avg cycle time</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.throughput.map((row) => (
                  <tr key={row.week} className="border-t border-rule">
                    <td className="px-3 py-2 font-mono text-xs">{row.week}</td>
                    <td className="px-3 py-2">{row.completed}</td>
                    <td className="px-3 py-2">{formatDuration(row.avgCycleMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TicketTable({
  rows,
  onOpenTicket,
  empty,
}: {
  rows: Array<{
    ticketId: Id<"tickets">;
    ticketKey: string;
    title: string;
    status: string;
    extra: string;
  }>;
  onOpenTicket: (id: Id<"tickets">) => void;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-dashed border-rule px-4 py-8 text-sm text-ink-soft">
        {empty}
      </p>
    );
  }
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-rule bg-paper-raised">
      <ul>
        {rows.map((row) => (
          <li key={row.ticketId} className="border-t border-rule first:border-t-0">
            <button
              type="button"
              onClick={() => onOpenTicket(row.ticketId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-amber-50/40"
            >
              <span className="font-mono text-xs text-ink-soft">{row.ticketKey}</span>
              <span className="flex-1 font-medium">{row.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  STATUS_PILL[row.status as TicketStatus] ?? "bg-stone-200"
                }`}
              >
                {STATUS_META[row.status as TicketStatus]?.label ?? row.status}
              </span>
              <span className="hidden text-xs text-ink-soft sm:inline">{row.extra}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
