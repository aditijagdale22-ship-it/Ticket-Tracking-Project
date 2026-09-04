import { FormEvent, useState } from "react";

type Props = {
  onJoin: (name: string) => Promise<void>;
};

export default function IdentityGate({ onJoin }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onJoin(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setPending(false);
    }
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
        </div>

        <div className="rounded-3xl border border-rule bg-paper-raised p-8 shadow-[0_20px_60px_-32px_rgba(28,25,23,0.45)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
