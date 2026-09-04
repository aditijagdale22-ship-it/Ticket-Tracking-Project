import { FormEvent, useState } from "react";
import { useQuery } from "../data/hooks";
import { api } from "../data/api";

type Props = {
  onJoin: (name: string) => Promise<void>;
};

export default function IdentityGate({ onJoin }: Props) {
  const people = useQuery<Array<{ _id: string; name: string }>>(
    api.users.listPublic,
    {},
  );
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(displayName: string) {
    setError(null);
    setPending(true);
    try {
      await onJoin(displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submit(name);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-paper">
      <div className="pointer-events-none absolute -left-24 top-[-8rem] h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-[-6rem] h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-full max-w-5xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">
            Shared workspace
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
            One status.
            <br />
            Every ticket.
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            Tickets used to live in chats and docs. Event Board keeps a single
            pipeline — New through Done — with a full audit trail on every change.
          </p>
          <ol className="mt-8 space-y-3 text-sm text-ink-soft">
            <li className="flex gap-3">
              <span className="font-mono text-ember">01</span>
              Linear pipeline, not a generic kanban dump
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-ember">02</span>
              Dropdown status updates, synced live
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-ember">03</span>
              Sprint on top, backlog underneath
            </li>
          </ol>
        </div>

        <div className="rounded-3xl border border-rule bg-paper-raised p-8 shadow-[0_20px_60px_-32px_rgba(28,25,23,0.45)]">
          <h2 className="font-display text-2xl">Who’s looking?</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Pick an existing name or join as yourself. Changes are attributed to
            this identity.
          </p>

          {people && people.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {people.map((person) => (
                <button
                  key={person._id}
                  type="button"
                  disabled={pending}
                  onClick={() => void submit(person.name)}
                  className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm hover:border-ink/30"
                >
                  {person.name}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-medium" htmlFor="display-name">
              Display name
            </label>
            <input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ada Chen"
              className="rounded-xl border border-rule bg-white px-3 py-2.5 outline-none ring-ember/30 focus:ring-2"
              required
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-ember px-4 py-2.5 font-semibold text-white hover:bg-ember-hover disabled:opacity-60"
            >
              {pending ? "Entering…" : "Enter the board"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
