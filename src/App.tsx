import { useEffect, useState } from "react";
import { useMutation, useQuery } from "./data/hooks";
import { api } from "./data/api";
import type { Id } from "./data/ids";
import {
  clearStoredUserId,
  readStoredUserId,
  writeStoredUserId,
} from "./lib/session";
import IdentityGate from "./components/IdentityGate";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [sheetsReady, setSheetsReady] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<Id<"users"> | null>(() => {
    const stored = readStoredUserId();
    return stored ? (stored as Id<"users">) : null;
  });

  useEffect(() => {
    void fetch("/api/health")
      .then((res) => res.json())
      .then((body: { ok?: boolean }) => setSheetsReady(Boolean(body.ok)))
      .catch(() => setSheetsReady(false));
  }, []);

  const user = useQuery<{ _id: Id<"users">; name: string } | null>(
    api.users.get,
    userId ? { userId } : "skip",
  );
  const identify = useMutation(api.users.identify);
  const ensureTeams = useMutation(api.seed.ensureDefaultTeams);

  useEffect(() => {
    if (userId && user === null) {
      clearStoredUserId();
      setUserId(null);
    }
  }, [userId, user]);

  async function signIn(name: string) {
    const id = (await identify({ name })) as Id<"users">;
    writeStoredUserId(id);
    setUserId(id);
    await ensureTeams({ actorId: id });
  }

  function signOut() {
    clearStoredUserId();
    setUserId(null);
  }

  if (sheetsReady === null) {
    return (
      <div className="flex h-full items-center justify-center text-ink-soft">
        Connecting to Google Sheets…
      </div>
    );
  }

  if (sheetsReady === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-medium text-ink">Google Sheets is not configured</p>
        <p className="max-w-md text-sm text-ink-soft">
          Add GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY to
          .env.local, share the spreadsheet with the service account (Editor), then
          restart npm run dev.
        </p>
      </div>
    );
  }

  if (userId && user === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-ink-soft">
        Loading workspace…
      </div>
    );
  }

  if (!userId || !user) {
    return <IdentityGate onJoin={signIn} />;
  }

  return (
    <Dashboard
      actorId={user._id}
      actorName={user.name}
      onSignOut={signOut}
    />
  );
}
