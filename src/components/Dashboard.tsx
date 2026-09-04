import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { Id } from "../data/ids";
import Sidebar from "./Sidebar";
import Workspace from "./Workspace";
import NewTicketModal from "./NewTicketModal";
import TicketDetail from "./TicketDetail";
import SprintReport from "./SprintReport";

type Props = {
  actorId: Id<"users">;
  actorName: string;
  onSignOut: () => void;
};

export default function Dashboard({ actorId, actorName, onSignOut }: Props) {
  const [ticketOpen, setTicketOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedTicket = searchParams.get("ticket") as Id<"tickets"> | null;
  const teamMatch = location.pathname.match(/^\/t\/([^/]+)/);
  const defaultTeamId = (teamMatch?.[1] as Id<"teams"> | undefined) ?? null;

  function openTicket(id: Id<"tickets">) {
    const next = new URLSearchParams(searchParams);
    next.set("ticket", id);
    setSearchParams(next, { replace: false });
  }

  function closeTicket() {
    const next = new URLSearchParams(searchParams);
    next.delete("ticket");
    setSearchParams(next, { replace: true });
  }

  function openSprint(id: Id<"sprints">) {
    navigate(`/sprint/${id}`);
  }

  return (
    <div className="flex h-full min-h-0">
      <Sidebar actorId={actorId} actorName={actorName} onSignOut={onSignOut} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Routes>
          <Route
            path="/"
            element={
              <Workspace
                actorId={actorId}
                teamId={null}
                onNewTicket={() => setTicketOpen(true)}
                onOpenTicket={openTicket}
                onOpenSprint={openSprint}
              />
            }
          />
          <Route
            path="/t/:teamId"
            element={
              <TeamRoute
                actorId={actorId}
                onNewTicket={() => setTicketOpen(true)}
                onOpenTicket={openTicket}
                onOpenSprint={openSprint}
              />
            }
          />
          <Route
            path="/sprint/:sprintId"
            element={
              <SprintRoute actorId={actorId} onOpenTicket={openTicket} />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {ticketOpen && (
        <NewTicketModal
          actorId={actorId}
          defaultTeamId={defaultTeamId}
          onClose={() => setTicketOpen(false)}
          onCreated={(id) => {
            setTicketOpen(false);
            openTicket(id);
          }}
        />
      )}
      {selectedTicket && (
        <TicketDetail
          actorId={actorId}
          ticketId={selectedTicket}
          onClose={closeTicket}
          onOpenTicket={openTicket}
        />
      )}
    </div>
  );
}

function TeamRoute({
  actorId,
  onNewTicket,
  onOpenTicket,
  onOpenSprint,
}: {
  actorId: Id<"users">;
  onNewTicket: () => void;
  onOpenTicket: (id: Id<"tickets">) => void;
  onOpenSprint: (id: Id<"sprints">) => void;
}) {
  const { teamId } = useParams();
  if (!teamId) {
    return <Navigate to="/" replace />;
  }
  return (
    <Workspace
      actorId={actorId}
      teamId={teamId as Id<"teams">}
      onNewTicket={onNewTicket}
      onOpenTicket={onOpenTicket}
      onOpenSprint={onOpenSprint}
    />
  );
}

function SprintRoute({
  actorId,
  onOpenTicket,
}: {
  actorId: Id<"users">;
  onOpenTicket: (id: Id<"tickets">) => void;
}) {
  const { sprintId } = useParams();
  if (!sprintId) {
    return <Navigate to="/" replace />;
  }
  return (
    <SprintReport
      actorId={actorId}
      sprintId={sprintId as Id<"sprints">}
      onOpenTicket={onOpenTicket}
    />
  );
}
